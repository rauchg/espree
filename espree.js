/*
Copyright (C) 2015 Fred K. Schott <fkschott@gmail.com>
Copyright (C) 2013 Ariya Hidayat <ariya.hidayat@gmail.com>
Copyright (C) 2013 Thaddee Tyl <thaddee.tyl@gmail.com>
Copyright (C) 2013 Mathias Bynens <mathias@qiwi.be>
Copyright (C) 2012 Ariya Hidayat <ariya.hidayat@gmail.com>
Copyright (C) 2012 Mathias Bynens <mathias@qiwi.be>
Copyright (C) 2012 Joost-Wim Boekesteijn <joost-wim@boekesteijn.nl>
Copyright (C) 2012 Kris Kowal <kris.kowal@cixar.com>
Copyright (C) 2012 Yusuke Suzuki <utatane.tea@gmail.com>
Copyright (C) 2012 Arpad Borsos <arpad.borsos@googlemail.com>
Copyright (C) 2011 Ariya Hidayat <ariya.hidayat@gmail.com>

Redistribution and use in source and binary forms, with or without
modification, are permitted provided that the following conditions are met:

* Redistributions of source code must retain the above copyright
  notice, this list of conditions and the following disclaimer.
* Redistributions in binary form must reproduce the above copyright
  notice, this list of conditions and the following disclaimer in the
  documentation and/or other materials provided with the distribution.

THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS"
AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE
IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE
ARE DISCLAIMED. IN NO EVENT SHALL <COPYRIGHT HOLDER> BE LIABLE FOR ANY
DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES
(INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES;
LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND
ON ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT
(INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE OF
THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
*/
/*eslint no-undefined:0, no-use-before-define: 0*/

"use strict";

var syntax = require("./lib/syntax"),
    tokenInfo = require("./lib/token-info"),
    astNodeTypes = require("./lib/ast-node-types"),
    astNodeFactory = require("./lib/ast-node-factory"),
    defaultFeatures = require("./lib/features"),
    Messages = require("./lib/messages"),
    XHTMLEntities = require("./lib/xhtml-entities"),
    StringMap = require("./lib/string-map");

var Token = tokenInfo.Token,
    TokenName = tokenInfo.TokenName,
    FnExprTokens = tokenInfo.FnExprTokens,
    Regex = syntax.Regex,
    PropertyKind,
    source,
    strict,
    index,
    lineNumber,
    lineStart,
    length,
    lookahead,
    state,
    extra;

PropertyKind = {
    Data: 1,
    Get: 2,
    Set: 4
};


// Ensure the condition is true, otherwise throw an error.
// This is only to have a better contract semantic, i.e. another safety net
// to catch a logic error. The condition shall be fulfilled in normal case.
// Do NOT use this to enforce a certain condition on any user input.

function assert(condition, message) {
    /* istanbul ignore if */
    if (!condition) {
        throw new Error("ASSERT: " + message);
    }
}

// 7.4 Comments

function addComment(type, value, start, end, loc) {
    var comment;

    assert(typeof start === "number", "Comment must have valid position");

    // Because the way the actual token is scanned, often the comments
    // (if any) are skipped twice during the lexical analysis.
    // Thus, we need to skip adding a comment if the comment array already
    // handled it.
    if (state.lastCommentStart >= start) {
        return;
    }
    state.lastCommentStart = start;

    comment = {
        type: type,
        value: value
    };
    if (extra.range) {
        comment.range = [start, end];
    }
    if (extra.loc) {
        comment.loc = loc;
    }
    extra.comments.push(comment);
    if (extra.attachComment) {
        extra.leadingComments.push(comment);
        extra.trailingComments.push(comment);
    }
}

function skipSingleLineComment(offset) {
    var start, loc, ch, comment;

    start = index - offset;
    loc = {
        start: {
            line: lineNumber,
            column: index - lineStart - offset
        }
    };

    while (index < length) {
        ch = source.charCodeAt(index);
        ++index;
        if (syntax.isLineTerminator(ch)) {
            if (extra.comments) {
                comment = source.slice(start + offset, index - 1);
                loc.end = {
                    line: lineNumber,
                    column: index - lineStart - 1
                };
                addComment("Line", comment, start, index - 1, loc);
            }
            if (ch === 13 && source.charCodeAt(index) === 10) {
                ++index;
            }
            ++lineNumber;
            lineStart = index;
            return;
        }
    }

    if (extra.comments) {
        comment = source.slice(start + offset, index);
        loc.end = {
            line: lineNumber,
            column: index - lineStart
        };
        addComment("Line", comment, start, index, loc);
    }
}

function skipMultiLineComment() {
    var start, loc, ch, comment;

    if (extra.comments) {
        start = index - 2;
        loc = {
            start: {
                line: lineNumber,
                column: index - lineStart - 2
            }
        };
    }

    while (index < length) {
        ch = source.charCodeAt(index);
        if (syntax.isLineTerminator(ch)) {
            if (ch === 0x0D && source.charCodeAt(index + 1) === 0x0A) {
                ++index;
            }
            ++lineNumber;
            ++index;
            lineStart = index;
            if (index >= length) {
                throwError({}, Messages.UnexpectedToken, "ILLEGAL");
            }
        } else if (ch === 0x2A) {
            // Block comment ends with "*/".
            if (source.charCodeAt(index + 1) === 0x2F) {
                ++index;
                ++index;
                if (extra.comments) {
                    comment = source.slice(start + 2, index - 2);
                    loc.end = {
                        line: lineNumber,
                        column: index - lineStart
                    };
                    addComment("Block", comment, start, index, loc);
                }
                return;
            }
            ++index;
        } else {
            ++index;
        }
    }

    throwError({}, Messages.UnexpectedToken, "ILLEGAL");
}

function skipComment() {
    var ch, start;

    start = (index === 0);
    while (index < length) {
        ch = source.charCodeAt(index);

        if (syntax.isWhiteSpace(ch)) {
            ++index;
        } else if (syntax.isLineTerminator(ch)) {
            ++index;
            if (ch === 0x0D && source.charCodeAt(index) === 0x0A) {
                ++index;
            }
            ++lineNumber;
            lineStart = index;
            start = true;
        } else if (ch === 0x2F) { // U+002F is "/"
            ch = source.charCodeAt(index + 1);
            if (ch === 0x2F) {
                ++index;
                ++index;
                skipSingleLineComment(2);
                start = true;
            } else if (ch === 0x2A) {  // U+002A is "*"
                ++index;
                ++index;
                skipMultiLineComment();
            } else {
                break;
            }
        } else if (start && ch === 0x2D) { // U+002D is "-"
            // U+003E is ">"
            if ((source.charCodeAt(index + 1) === 0x2D) && (source.charCodeAt(index + 2) === 0x3E)) {
                // "-->" is a single-line comment
                index += 3;
                skipSingleLineComment(3);
            } else {
                break;
            }
        } else if (ch === 0x3C) { // U+003C is "<"
            if (source.slice(index + 1, index + 4) === "!--") {
                ++index; // `<`
                ++index; // `!`
                ++index; // `-`
                ++index; // `-`
                skipSingleLineComment(4);
            } else {
                break;
            }
        } else {
            break;
        }
    }
}

function scanHexEscape(prefix) {
    var i, len, ch, code = 0;

    len = (prefix === "u") ? 4 : 2;
    for (i = 0; i < len; ++i) {
        if (index < length && syntax.isHexDigit(source[index])) {
            ch = source[index++];
            code = code * 16 + "0123456789abcdef".indexOf(ch.toLowerCase());
        } else {
            return "";
        }
    }
    return String.fromCharCode(code);
}

/**
 * Scans an extended unicode code point escape sequence from source. Throws an
 * error if the sequence is empty or if the code point value is too large.
 * @returns {string} The string created by the Unicode escape sequence.
 * @private
 */
function scanUnicodeCodePointEscape() {
    var ch, code, cu1, cu2;

    ch = source[index];
    code = 0;

    // At least one hex digit is required.
    if (ch === "}") {
        throwError({}, Messages.UnexpectedToken, "ILLEGAL");
    }

    while (index < length) {
        ch = source[index++];
        if (!syntax.isHexDigit(ch)) {
            break;
        }
        code = code * 16 + "0123456789abcdef".indexOf(ch.toLowerCase());
    }

    if (code > 0x10FFFF || ch !== "}") {
        throwError({}, Messages.UnexpectedToken, "ILLEGAL");
    }

    // UTF-16 Encoding
    if (code <= 0xFFFF) {
        return String.fromCharCode(code);
    }
    cu1 = ((code - 0x10000) >> 10) + 0xD800;
    cu2 = ((code - 0x10000) & 1023) + 0xDC00;
    return String.fromCharCode(cu1, cu2);
}

function getEscapedIdentifier() {
    var ch, id;

    ch = source.charCodeAt(index++);
    id = String.fromCharCode(ch);

    // "\u" (U+005C, U+0075) denotes an escaped character.
    if (ch === 0x5C) {
        if (source.charCodeAt(index) !== 0x75) {
            throwError({}, Messages.UnexpectedToken, "ILLEGAL");
        }
        ++index;
        ch = scanHexEscape("u");
        if (!ch || ch === "\\" || !syntax.isIdentifierStart(ch.charCodeAt(0))) {
            throwError({}, Messages.UnexpectedToken, "ILLEGAL");
        }
        id = ch;
    }

    while (index < length) {
        ch = source.charCodeAt(index);
        if (!syntax.isIdentifierPart(ch)) {
            break;
        }
        ++index;
        id += String.fromCharCode(ch);

        // "\u" (U+005C, U+0075) denotes an escaped character.
        if (ch === 0x5C) {
            id = id.substr(0, id.length - 1);
            if (source.charCodeAt(index) !== 0x75) {
                throwError({}, Messages.UnexpectedToken, "ILLEGAL");
            }
            ++index;
            ch = scanHexEscape("u");
            if (!ch || ch === "\\" || !syntax.isIdentifierPart(ch.charCodeAt(0))) {
                throwError({}, Messages.UnexpectedToken, "ILLEGAL");
            }
            id += ch;
        }
    }

    return id;
}

function getIdentifier() {
    var start, ch;

    start = index++;
    while (index < length) {
        ch = source.charCodeAt(index);
        if (ch === 0x5C) {
            // Blackslash (U+005C) marks Unicode escape sequence.
            index = start;
            return getEscapedIdentifier();
        }
        if (syntax.isIdentifierPart(ch)) {
            ++index;
        } else {
            break;
        }
    }

    return source.slice(start, index);
}

function scanIdentifier() {
    var start, id, type;

    start = index;

    // Backslash (U+005C) starts an escaped character.
    id = (source.charCodeAt(index) === 0x5C) ? getEscapedIdentifier() : getIdentifier();

    // There is no keyword or literal with only one character.
    // Thus, it must be an identifier.
    if (id.length === 1) {
        type = Token.Identifier;
    } else if (syntax.isKeyword(id, strict, extra.ecmaFeatures)) {
        type = Token.Keyword;
    } else if (id === "null") {
        type = Token.NullLiteral;
    } else if (id === "true" || id === "false") {
        type = Token.BooleanLiteral;
    } else {
        type = Token.Identifier;
    }

    return {
        type: type,
        value: id,
        lineNumber: lineNumber,
        lineStart: lineStart,
        range: [start, index]
    };
}


// 7.7 Punctuators

function scanPunctuator() {
    var start = index,
        code = source.charCodeAt(index),
        code2,
        ch1 = source[index],
        ch2,
        ch3,
        ch4;

    switch (code) {
        // Check for most common single-character punctuators.
        case 40:   // ( open bracket
        case 41:   // ) close bracket
        case 59:   // ; semicolon
        case 44:   // , comma
        case 123:  // { open curly brace
        case 125:  // } close curly brace
        case 91:   // [
        case 93:   // ]
        case 58:   // :
        case 63:   // ?
        case 126:  // ~
            ++index;
            if (extra.tokenize) {
                if (code === 40) {
                    extra.openParenToken = extra.tokens.length;
                } else if (code === 123) {
                    extra.openCurlyToken = extra.tokens.length;
                }
            }
            return {
                type: Token.Punctuator,
                value: String.fromCharCode(code),
                lineNumber: lineNumber,
                lineStart: lineStart,
                range: [start, index]
            };

        default:
            code2 = source.charCodeAt(index + 1);

            // "=" (char #61) marks an assignment or comparison operator.
            if (code2 === 61) {
                switch (code) {
                    case 37:  // %
                    case 38:  // &
                    case 42:  // *:
                    case 43:  // +
                    case 45:  // -
                    case 47:  // /
                    case 60:  // <
                    case 62:  // >
                    case 94:  // ^
                    case 124: // |
                        index += 2;
                        return {
                            type: Token.Punctuator,
                            value: String.fromCharCode(code) + String.fromCharCode(code2),
                            lineNumber: lineNumber,
                            lineStart: lineStart,
                            range: [start, index]
                        };

                    case 33: // !
                    case 61: // =
                        index += 2;

                        // !== and ===
                        if (source.charCodeAt(index) === 61) {
                            ++index;
                        }
                        return {
                            type: Token.Punctuator,
                            value: source.slice(start, index),
                            lineNumber: lineNumber,
                            lineStart: lineStart,
                            range: [start, index]
                        };
                    default:
                        break;
                }
            }
            break;
    }

    // Peek more characters.

    ch2 = source[index + 1];
    ch3 = source[index + 2];
    ch4 = source[index + 3];

    // 4-character punctuator: >>>=

    if (ch1 === ">" && ch2 === ">" && ch3 === ">") {
        if (ch4 === "=") {
            index += 4;
            return {
                type: Token.Punctuator,
                value: ">>>=",
                lineNumber: lineNumber,
                lineStart: lineStart,
                range: [start, index]
            };
        }
    }

    // 3-character punctuators: === !== >>> <<= >>=

    if (ch1 === ">" && ch2 === ">" && ch3 === ">") {
        index += 3;
        return {
            type: Token.Punctuator,
            value: ">>>",
            lineNumber: lineNumber,
            lineStart: lineStart,
            range: [start, index]
        };
    }

    if (ch1 === "<" && ch2 === "<" && ch3 === "=") {
        index += 3;
        return {
            type: Token.Punctuator,
            value: "<<=",
            lineNumber: lineNumber,
            lineStart: lineStart,
            range: [start, index]
        };
    }

    if (ch1 === ">" && ch2 === ">" && ch3 === "=") {
        index += 3;
        return {
            type: Token.Punctuator,
            value: ">>=",
            lineNumber: lineNumber,
            lineStart: lineStart,
            range: [start, index]
        };
    }

    // The ... operator (spread, restParams, JSX, etc.)
    if (extra.ecmaFeatures.spread ||
        extra.ecmaFeatures.restParams ||
        (extra.ecmaFeatures.jsx && state.inJSXSpreadAttribute)
    ) {
        if (ch1 === "." && ch2 === "." && ch3 === ".") {
            index += 3;
            return {
                type: Token.Punctuator,
                value: "...",
                lineNumber: lineNumber,
                lineStart: lineStart,
                range: [start, index]
            };
        }
    }

    // Other 2-character punctuators: ++ -- << >> && ||
    if (ch1 === ch2 && ("+-<>&|".indexOf(ch1) >= 0)) {
        index += 2;
        return {
            type: Token.Punctuator,
            value: ch1 + ch2,
            lineNumber: lineNumber,
            lineStart: lineStart,
            range: [start, index]
        };
    }

    // the => for arrow functions
    if (extra.ecmaFeatures.arrowFunctions) {
        if (ch1 === "=" && ch2 === ">") {
            index += 2;
            return {
                type: Token.Punctuator,
                value: "=>",
                lineNumber: lineNumber,
                lineStart: lineStart,
                range: [start, index]
            };
        }
    }

    if ("<>=!+-*%&|^/".indexOf(ch1) >= 0) {
        ++index;
        return {
            type: Token.Punctuator,
            value: ch1,
            lineNumber: lineNumber,
            lineStart: lineStart,
            range: [start, index]
        };
    }

    if (ch1 === ".") {
        ++index;
        return {
            type: Token.Punctuator,
            value: ch1,
            lineNumber: lineNumber,
            lineStart: lineStart,
            range: [start, index]
        };
    }

    throwError({}, Messages.UnexpectedToken, "ILLEGAL");
}

// 7.8.3 Numeric Literals

function scanHexLiteral(start) {
    var number = "";

    while (index < length) {
        if (!syntax.isHexDigit(source[index])) {
            break;
        }
        number += source[index++];
    }

    if (number.length === 0) {
        throwError({}, Messages.UnexpectedToken, "ILLEGAL");
    }

    if (syntax.isIdentifierStart(source.charCodeAt(index))) {
        throwError({}, Messages.UnexpectedToken, "ILLEGAL");
    }

    return {
        type: Token.NumericLiteral,
        value: parseInt("0x" + number, 16),
        lineNumber: lineNumber,
        lineStart: lineStart,
        range: [start, index]
    };
}

function scanBinaryLiteral(start) {
    var ch, number = "";

    while (index < length) {
        ch = source[index];
        if (ch !== "0" && ch !== "1") {
            break;
        }
        number += source[index++];
    }

    if (number.length === 0) {
        // only 0b or 0B
        throwError({}, Messages.UnexpectedToken, "ILLEGAL");
    }


    if (index < length) {
        ch = source.charCodeAt(index);
        /* istanbul ignore else */
        if (syntax.isIdentifierStart(ch) || syntax.isDecimalDigit(ch)) {
            throwError({}, Messages.UnexpectedToken, "ILLEGAL");
        }
    }

    return {
        type: Token.NumericLiteral,
        value: parseInt(number, 2),
        lineNumber: lineNumber,
        lineStart: lineStart,
        range: [start, index]
    };
}

function scanOctalLiteral(prefix, start) {
    var number, octal;

    if (syntax.isOctalDigit(prefix)) {
        octal = true;
        number = "0" + source[index++];
    } else {
        octal = false;
        ++index;
        number = "";
    }


    while (index < length) {
        if (!syntax.isOctalDigit(source[index])) {
            break;
        }
        number += source[index++];
    }

    if (!octal && number.length === 0) {
        // only 0o or 0O
        throwError({}, Messages.UnexpectedToken, "ILLEGAL");
    }

    if (syntax.isIdentifierStart(source.charCodeAt(index)) || syntax.isDecimalDigit(source.charCodeAt(index))) {
        throwError({}, Messages.UnexpectedToken, "ILLEGAL");
    }

    return {
        type: Token.NumericLiteral,
        value: parseInt(number, 8),
        octal: true,
        lineNumber: lineNumber,
        lineStart: lineStart,
        range: [start, index]
    };
}

function scanNumericLiteral() {
    var number, start, ch;

    ch = source[index];
    assert(syntax.isDecimalDigit(ch.charCodeAt(0)) || (ch === "."),
        "Numeric literal must start with a decimal digit or a decimal point");

    start = index;
    number = "";
    if (ch !== ".") {
        number = source[index++];
        ch = source[index];

        // Hex number starts with "0x".
        // Octal number starts with "0".
        if (number === "0") {
            if (ch === "x" || ch === "X") {
                ++index;
                return scanHexLiteral(start);
            }

            // Binary number in ES6 starts with '0b'
            if (extra.ecmaFeatures.binaryLiterals) {
                if (ch === "b" || ch === "B") {
                    ++index;
                    return scanBinaryLiteral(start);
                }
            }

            if ((extra.ecmaFeatures.octalLiterals && (ch === "o" || ch === "O")) || syntax.isOctalDigit(ch)) {
                return scanOctalLiteral(ch, start);
            }

            // decimal number starts with "0" such as "09" is illegal.
            if (ch && syntax.isDecimalDigit(ch.charCodeAt(0))) {
                throwError({}, Messages.UnexpectedToken, "ILLEGAL");
            }
        }

        while (syntax.isDecimalDigit(source.charCodeAt(index))) {
            number += source[index++];
        }
        ch = source[index];
    }

    if (ch === ".") {
        number += source[index++];
        while (syntax.isDecimalDigit(source.charCodeAt(index))) {
            number += source[index++];
        }
        ch = source[index];
    }

    if (ch === "e" || ch === "E") {
        number += source[index++];

        ch = source[index];
        if (ch === "+" || ch === "-") {
            number += source[index++];
        }
        if (syntax.isDecimalDigit(source.charCodeAt(index))) {
            while (syntax.isDecimalDigit(source.charCodeAt(index))) {
                number += source[index++];
            }
        } else {
            throwError({}, Messages.UnexpectedToken, "ILLEGAL");
        }
    }

    if (syntax.isIdentifierStart(source.charCodeAt(index))) {
        throwError({}, Messages.UnexpectedToken, "ILLEGAL");
    }

    return {
        type: Token.NumericLiteral,
        value: parseFloat(number),
        lineNumber: lineNumber,
        lineStart: lineStart,
        range: [start, index]
    };
}

/**
 * Scan a string escape sequence and return its special character.
 * @param {string} ch The starting character of the given sequence.
 * @returns {Object} An object containing the character and a flag
 * if the escape sequence was an octal.
 * @private
 */
function scanEscapeSequence(ch) {
    var code,
        unescaped,
        restore,
        escapedCh,
        octal = false;

    // An escape sequence cannot be empty
    if (!ch) {
        throwError({}, Messages.UnexpectedToken, "ILLEGAL");
    }

    if (syntax.isLineTerminator(ch.charCodeAt(0))) {
        ++lineNumber;
        if (ch === "\r" && source[index] === "\n") {
            ++index;
        }
        lineStart = index;
        escapedCh = "";
    } else if (ch === "u" && source[index] === "{") {
        // Handle ES6 extended unicode code point escape sequences.
        if (extra.ecmaFeatures.unicodeCodePointEscapes) {
            ++index;
            escapedCh = scanUnicodeCodePointEscape();
        } else {
            throwError({}, Messages.UnexpectedToken, "ILLEGAL");
        }
    } else if (ch === "u" || ch === "x") {
        // Handle other unicode and hex codes normally
        restore = index;
        unescaped = scanHexEscape(ch);
        if (unescaped) {
            escapedCh = unescaped;
        } else {
            index = restore;
            escapedCh = ch;
        }
    } else if (ch === "n") {
        escapedCh = "\n";
    } else if (ch === "r") {
        escapedCh = "\r";
    } else if (ch === "t") {
        escapedCh = "\t";
    } else if (ch === "b") {
        escapedCh = "\b";
    } else if (ch === "f") {
        escapedCh = "\f";
    } else if (ch === "v") {
        escapedCh = "\v";
    } else if (syntax.isOctalDigit(ch)) {
        code = "01234567".indexOf(ch);

        // \0 is not octal escape sequence
        if (code !== 0) {
            octal = true;
        }

        if (index < length && syntax.isOctalDigit(source[index])) {
            octal = true;
            code = code * 8 + "01234567".indexOf(source[index++]);

            // 3 digits are only allowed when string starts with 0, 1, 2, 3
            if ("0123".indexOf(ch) >= 0 &&
                    index < length &&
                    syntax.isOctalDigit(source[index])) {
                code = code * 8 + "01234567".indexOf(source[index++]);
            }
        }
        escapedCh = String.fromCharCode(code);
    } else {
        escapedCh = ch;
    }

    return {
        ch: escapedCh,
        octal: octal
    };
}

function scanStringLiteral() {
    var str = "",
        ch,
        escapedSequence,
        octal = false,
        start = index,
        startLineNumber = lineNumber,
        startLineStart = lineStart,
        quote = source[index];

    assert((quote === "'" || quote === "\""),
        "String literal must starts with a quote");

    ++index;

    while (index < length) {
        ch = source[index++];

        if (syntax.isLineTerminator(ch.charCodeAt(0))) {
            break;
        } else if (ch === quote) {
            quote = "";
            break;
        } else if (ch === "\\") {
            ch = source[index++];
            escapedSequence = scanEscapeSequence(ch);
            str += escapedSequence.ch;
            octal = escapedSequence.octal || octal;
        } else {
            str += ch;
        }
    }

    if (quote !== "") {
        throwError({}, Messages.UnexpectedToken, "ILLEGAL");
    }

    return {
        type: Token.StringLiteral,
        value: str,
        octal: octal,
        startLineNumber: startLineNumber,
        startLineStart: startLineStart,
        lineNumber: lineNumber,
        lineStart: lineStart,
        range: [start, index]
    };
}

/**
 * Scan a template string and return a token. This scans both the first and
 * subsequent pieces of a template string and assumes that the first backtick
 * or the closing } have already been scanned.
 * @returns {Token} The template string token.
 * @private
 */
function scanTemplate() {
    var cooked = "",
        ch,
        escapedSequence,
        octal = false,
        start = index,
        terminated = false,
        tail = false,
        head = (source[index] === "`");

    ++index;

    while (index < length) {
        ch = source[index++];

        if (ch === "`") {
            tail = true;
            terminated = true;
            break;
        } else if (ch === "$") {
            if (source[index] === "{") {
                ++index;
                terminated = true;
                break;
            }
            cooked += ch;
        } else if (ch === "\\") {
            ch = source[index++];
            escapedSequence = scanEscapeSequence(ch);
            cooked += escapedSequence.ch;
            octal = escapedSequence.octal || octal;
        } else if (syntax.isLineTerminator(ch.charCodeAt(0))) {
            ++lineNumber;
            if (ch === "\r" && source[index] === "\n") {
                ++index;
            }
            lineStart = index;
            cooked += "\n";
        } else {
            cooked += ch;
        }
    }

    if (!terminated) {
        throwError({}, Messages.UnexpectedToken, "ILLEGAL");
    }

    return {
        type: Token.Template,
        value: {
            cooked: cooked,
            raw: source.slice(start + 1, index - ((tail) ? 1 : 2))
        },
        head: head,
        tail: tail,
        octal: octal,
        lineNumber: lineNumber,
        lineStart: lineStart,
        range: [start, index]
    };
}

/**
 * Scan a template string element and return a ASTNode representation
 * @param {Object} options Scan options
 * @param {Object} options.head True if this element is the first in the
 *                               template string, false otherwise.
 * @returns {ASTNode} The template element node
 * @private
 */
function scanTemplateElement(options) {
    var startsWith, template;

    lookahead = null;
    skipComment();

    startsWith = (options.head) ? "`" : "}";

    if (source[index] !== startsWith) {
        throwError({}, Messages.UnexpectedToken, "ILLEGAL");
    }

    template = scanTemplate();

    if (!template.tail) {
        extra.curlies.push("template");
    }

    peek();

    return template;
}

function testRegExp(pattern, flags) {
    var tmp = pattern,
        validFlags = "gmsi";

    if (extra.ecmaFeatures.regexYFlag) {
        validFlags += "y";
    }

    if (extra.ecmaFeatures.regexUFlag) {
        validFlags += "u";
    }

    if (!RegExp("^[" + validFlags + "]*$").test(flags)) {
        throwError({}, Messages.InvalidRegExpFlag);
    }


    if (flags.indexOf("u") >= 0) {
        // Replace each astral symbol and every Unicode code point
        // escape sequence with a single ASCII symbol to avoid throwing on
        // regular expressions that are only valid in combination with the
        // `/u` flag.
        // Note: replacing with the ASCII symbol `x` might cause false
        // negatives in unlikely scenarios. For example, `[\u{61}-b]` is a
        // perfectly valid pattern that is equivalent to `[a-b]`, but it
        // would be replaced by `[x-b]` which throws an error.
        tmp = tmp
            .replace(/\\u\{([0-9a-fA-F]+)\}/g, function ($0, $1) {
                if (parseInt($1, 16) <= 0x10FFFF) {
                    return "x";
                }
                throwError({}, Messages.InvalidRegExp);
            })
            .replace(/[\uD800-\uDBFF][\uDC00-\uDFFF]/g, "x");
    }

    // First, detect invalid regular expressions.
    try {
        RegExp(tmp);
    } catch (e) {
        throwError({}, Messages.InvalidRegExp);
    }

    // Return a regular expression object for this pattern-flag pair, or
    // `null` in case the current environment doesn't support the flags it
    // uses.
    try {
        return new RegExp(pattern, flags);
    } catch (exception) {
        return null;
    }
}

function scanRegExpBody() {
    var ch, str, classMarker, terminated, body;

    ch = source[index];
    assert(ch === "/", "Regular expression literal must start with a slash");
    str = source[index++];

    classMarker = false;
    terminated = false;
    while (index < length) {
        ch = source[index++];
        str += ch;
        if (ch === "\\") {
            ch = source[index++];
            // ECMA-262 7.8.5
            if (syntax.isLineTerminator(ch.charCodeAt(0))) {
                throwError({}, Messages.UnterminatedRegExp);
            }
            str += ch;
        } else if (syntax.isLineTerminator(ch.charCodeAt(0))) {
            throwError({}, Messages.UnterminatedRegExp);
        } else if (classMarker) {
            if (ch === "]") {
                classMarker = false;
            }
        } else {
            if (ch === "/") {
                terminated = true;
                break;
            } else if (ch === "[") {
                classMarker = true;
            }
        }
    }

    if (!terminated) {
        throwError({}, Messages.UnterminatedRegExp);
    }

    // Exclude leading and trailing slash.
    body = str.substr(1, str.length - 2);
    return {
        value: body,
        literal: str
    };
}

function scanRegExpFlags() {
    var ch, str, flags, restore;

    str = "";
    flags = "";
    while (index < length) {
        ch = source[index];
        if (!syntax.isIdentifierPart(ch.charCodeAt(0))) {
            break;
        }

        ++index;
        if (ch === "\\" && index < length) {
            ch = source[index];
            if (ch === "u") {
                ++index;
                restore = index;
                ch = scanHexEscape("u");
                if (ch) {
                    flags += ch;
                    for (str += "\\u"; restore < index; ++restore) {
                        str += source[restore];
                    }
                } else {
                    index = restore;
                    flags += "u";
                    str += "\\u";
                }
                throwErrorTolerant({}, Messages.UnexpectedToken, "ILLEGAL");
            } else {
                str += "\\";
                throwErrorTolerant({}, Messages.UnexpectedToken, "ILLEGAL");
            }
        } else {
            flags += ch;
            str += ch;
        }
    }

    return {
        value: flags,
        literal: str
    };
}

function scanRegExp() {
    var start, body, flags, value;

    lookahead = null;
    skipComment();
    start = index;

    body = scanRegExpBody();
    flags = scanRegExpFlags();
    value = testRegExp(body.value, flags.value);

    if (extra.tokenize) {
        return {
            type: Token.RegularExpression,
            value: value,
            regex: {
                pattern: body.value,
                flags: flags.value
            },
            lineNumber: lineNumber,
            lineStart: lineStart,
            range: [start, index]
        };
    }

    return {
        literal: body.literal + flags.literal,
        value: value,
        regex: {
            pattern: body.value,
            flags: flags.value
        },
        range: [start, index]
    };
}

function collectRegex() {
    var pos, loc, regex, token;

    skipComment();

    pos = index;
    loc = {
        start: {
            line: lineNumber,
            column: index - lineStart
        }
    };

    regex = scanRegExp();
    loc.end = {
        line: lineNumber,
        column: index - lineStart
    };

    /* istanbul ignore next */
    if (!extra.tokenize) {
        // Pop the previous token, which is likely "/" or "/="
        if (extra.tokens.length > 0) {
            token = extra.tokens[extra.tokens.length - 1];
            if (token.range[0] === pos && token.type === "Punctuator") {
                if (token.value === "/" || token.value === "/=") {
                    extra.tokens.pop();
                }
            }
        }

        extra.tokens.push({
            type: "RegularExpression",
            value: regex.literal,
            regex: regex.regex,
            range: [pos, index],
            loc: loc
        });
    }

    return regex;
}

function isIdentifierName(token) {
    return token.type === Token.Identifier ||
        token.type === Token.Keyword ||
        token.type === Token.BooleanLiteral ||
        token.type === Token.NullLiteral;
}

function advanceSlash() {
    var prevToken,
        checkToken;
    // Using the following algorithm:
    // https://github.com/mozilla/sweet.js/wiki/design
    prevToken = extra.tokens[extra.tokens.length - 1];
    if (!prevToken) {
        // Nothing before that: it cannot be a division.
        return collectRegex();
    }
    if (prevToken.type === "Punctuator") {
        if (prevToken.value === "]") {
            return scanPunctuator();
        }
        if (prevToken.value === ")") {
            checkToken = extra.tokens[extra.openParenToken - 1];
            if (checkToken &&
                    checkToken.type === "Keyword" &&
                    (checkToken.value === "if" ||
                     checkToken.value === "while" ||
                     checkToken.value === "for" ||
                     checkToken.value === "with")) {
                return collectRegex();
            }
            return scanPunctuator();
        }
        if (prevToken.value === "}") {
            // Dividing a function by anything makes little sense,
            // but we have to check for that.
            if (extra.tokens[extra.openCurlyToken - 3] &&
                    extra.tokens[extra.openCurlyToken - 3].type === "Keyword") {
                // Anonymous function.
                checkToken = extra.tokens[extra.openCurlyToken - 4];
                if (!checkToken) {
                    return scanPunctuator();
                }
            } else if (extra.tokens[extra.openCurlyToken - 4] &&
                    extra.tokens[extra.openCurlyToken - 4].type === "Keyword") {
                // Named function.
                checkToken = extra.tokens[extra.openCurlyToken - 5];
                if (!checkToken) {
                    return collectRegex();
                }
            } else {
                return scanPunctuator();
            }
            // checkToken determines whether the function is
            // a declaration or an expression.
            if (FnExprTokens.indexOf(checkToken.value) >= 0) {
                // It is an expression.
                return scanPunctuator();
            }
            // It is a declaration.
            return collectRegex();
        }
        return collectRegex();
    }
    if (prevToken.type === "Keyword") {
        return collectRegex();
    }
    return scanPunctuator();
}

function advance() {
    var ch,
        allowJSX = extra.ecmaFeatures.jsx,
        allowTemplateStrings = extra.ecmaFeatures.templateStrings;

    /*
     * If JSX isn't allowed or JSX is allowed and we're not inside an JSX child,
     * then skip any comments.
     */
    if (!allowJSX || !state.inJSXChild) {
        skipComment();
    }

    if (index >= length) {
        return {
            type: Token.EOF,
            lineNumber: lineNumber,
            lineStart: lineStart,
            range: [index, index]
        };
    }

    // if inside an JSX child, then abort regular tokenization
    if (allowJSX && state.inJSXChild) {
        return advanceJSXChild();
    }

    ch = source.charCodeAt(index);

    // Very common: ( and ) and ;
    if (ch === 0x28 || ch === 0x29 || ch === 0x3B) {
        return scanPunctuator();
    }

    // String literal starts with single quote (U+0027) or double quote (U+0022).
    if (ch === 0x27 || ch === 0x22) {
        if (allowJSX && state.inJSXTag) {
            return scanJSXStringLiteral();
        }

        return scanStringLiteral();
    }

    if (allowJSX && state.inJSXTag && syntax.isJSXIdentifierStart(ch)) {
        return scanJSXIdentifier();
    }

    // Template strings start with backtick (U+0096) or closing curly brace (125) and backtick.
    if (allowTemplateStrings) {

        // template strings start with backtick (96) or open curly (125) but only if the open
        // curly closes a previously opened curly from a template.
        if (ch === 96 || (ch === 125 && extra.curlies[extra.curlies.length - 1] === "template")) {
            extra.curlies.pop();
            return scanTemplate();
        }
    }

    if (syntax.isIdentifierStart(ch)) {
        return scanIdentifier();
    }

    // Dot (.) U+002E can also start a floating-point number, hence the need
    // to check the next character.
    if (ch === 0x2E) {
        if (syntax.isDecimalDigit(source.charCodeAt(index + 1))) {
            return scanNumericLiteral();
        }
        return scanPunctuator();
    }

    if (syntax.isDecimalDigit(ch)) {
        return scanNumericLiteral();
    }

    // Slash (/) U+002F can also start a regex.
    if (extra.tokenize && ch === 0x2F) {
        return advanceSlash();
    }

    return scanPunctuator();
}

function collectToken() {
    var loc, token, range, value, entry,
        allowJSX = extra.ecmaFeatures.jsx;

    /* istanbul ignore else */
    if (!allowJSX || !state.inJSXChild) {
        skipComment();
    }

    loc = {
        start: {
            line: lineNumber,
            column: index - lineStart
        }
    };

    token = advance();
    loc.end = {
        line: lineNumber,
        column: index - lineStart
    };

    if (token.type !== Token.EOF) {
        range = [token.range[0], token.range[1]];
        value = source.slice(token.range[0], token.range[1]);
        entry = {
            type: TokenName[token.type],
            value: value,
            range: range,
            loc: loc
        };
        if (token.regex) {
            entry.regex = {
                pattern: token.regex.pattern,
                flags: token.regex.flags
            };
        }
        extra.tokens.push(entry);
    }

    return token;
}

function lex() {
    var token;

    token = lookahead;
    index = token.range[1];
    lineNumber = token.lineNumber;
    lineStart = token.lineStart;

    lookahead = (typeof extra.tokens !== "undefined") ? collectToken() : advance();

    index = token.range[1];
    lineNumber = token.lineNumber;
    lineStart = token.lineStart;

    if (token.type === Token.Template) {
        if (token.tail) {
            extra.curlies.pop();
        } else {
            extra.curlies.push("template");
        }
    }

    if (token.value === "{") {
        extra.curlies.push("{");
    }

    if (token.value === "}") {
        extra.curlies.pop();
    }

    return token;
}

function peek() {
    var pos,
        line,
        start;

    pos = index;
    line = lineNumber;
    start = lineStart;

    lookahead = (typeof extra.tokens !== "undefined") ? collectToken() : advance();

    index = pos;
    lineNumber = line;
    lineStart = start;
}

function lookahead2() {
    var adv, pos, line, start, result;

    // If we are collecting the tokens, don't grab the next one yet.
    /* istanbul ignore next */
    adv = (typeof extra.advance === "function") ? extra.advance : advance;

    pos = index;
    line = lineNumber;
    start = lineStart;

    // Scan for the next immediate token.
    /* istanbul ignore if */
    if (lookahead === null) {
        lookahead = adv();
    }
    index = lookahead.range[1];
    lineNumber = lookahead.lineNumber;
    lineStart = lookahead.lineStart;

    // Grab the token right after.
    result = adv();
    index = pos;
    lineNumber = line;
    lineStart = start;

    return result;
}


//------------------------------------------------------------------------------
// JSX
//------------------------------------------------------------------------------

function getQualifiedJSXName(object) {
    if (object.type === astNodeTypes.JSXIdentifier) {
        return object.name;
    }
    if (object.type === astNodeTypes.JSXNamespacedName) {
        return object.namespace.name + ":" + object.name.name;
    }
    /* istanbul ignore else */
    if (object.type === astNodeTypes.JSXMemberExpression) {
        return (
            getQualifiedJSXName(object.object) + "." +
            getQualifiedJSXName(object.property)
        );
    }
    /* istanbul ignore next */
    throwUnexpected(object);
}

function scanJSXIdentifier() {
    var ch, start, value = "";

    start = index;
    while (index < length) {
        ch = source.charCodeAt(index);
        if (!syntax.isJSXIdentifierPart(ch)) {
            break;
        }
        value += source[index++];
    }

    return {
        type: Token.JSXIdentifier,
        value: value,
        lineNumber: lineNumber,
        lineStart: lineStart,
        range: [start, index]
    };
}

function scanJSXEntity() {
    var ch, str = "", start = index, count = 0, code;
    ch = source[index];
    assert(ch === "&", "Entity must start with an ampersand");
    index++;
    while (index < length && count++ < 10) {
        ch = source[index++];
        if (ch === ";") {
            break;
        }
        str += ch;
    }

    // Well-formed entity (ending was found).
    if (ch === ";") {
        // Numeric entity.
        if (str[0] === "#") {
            if (str[1] === "x") {
                code = +("0" + str.substr(1));
            } else {
                // Removing leading zeros in order to avoid treating as octal in old browsers.
                code = +str.substr(1).replace(Regex.LeadingZeros, "");
            }

            if (!isNaN(code)) {
                return String.fromCharCode(code);
            }
        /* istanbul ignore else */
        } else if (XHTMLEntities[str]) {
            return XHTMLEntities[str];
        }
    }

    // Treat non-entity sequences as regular text.
    index = start + 1;
    return "&";
}

function scanJSXText(stopChars) {
    var ch, str = "", start;
    start = index;
    while (index < length) {
        ch = source[index];
        if (stopChars.indexOf(ch) !== -1) {
            break;
        }
        if (ch === "&") {
            str += scanJSXEntity();
        } else {
            index++;
            if (ch === "\r" && source[index] === "\n") {
                str += ch;
                ch = source[index];
                index++;
            }
            if (syntax.isLineTerminator(ch.charCodeAt(0))) {
                ++lineNumber;
                lineStart = index;
            }
            str += ch;
        }
    }
    return {
        type: Token.JSXText,
        value: str,
        lineNumber: lineNumber,
        lineStart: lineStart,
        range: [start, index]
    };
}

function scanJSXStringLiteral() {
    var innerToken, quote, start;

    quote = source[index];
    assert((quote === "\"" || quote === "'"),
        "String literal must starts with a quote");

    start = index;
    ++index;

    innerToken = scanJSXText([quote]);

    if (quote !== source[index]) {
        throwError({}, Messages.UnexpectedToken, "ILLEGAL");
    }

    ++index;

    innerToken.range = [start, index];

    return innerToken;
}

/*
 * Between JSX opening and closing tags (e.g. <foo>HERE</foo>), anything that
 * is not another JSX tag and is not an expression wrapped by {} is text.
 */
function advanceJSXChild() {
    var ch = source.charCodeAt(index);

    // { (123) and < (60)
    if (ch !== 123 && ch !== 60) {
        return scanJSXText(["<", "{"]);
    }

    return scanPunctuator();
}

function parseJSXIdentifier() {
    var token, marker = markerCreate();

    if (lookahead.type !== Token.JSXIdentifier) {
        throwUnexpected(lookahead);
    }

    token = lex();
    return markerApply(marker, astNodeFactory.createJSXIdentifier(token.value));
}

function parseJSXNamespacedName() {
    var namespace, name, marker = markerCreate();

    namespace = parseJSXIdentifier();
    expect(":");
    name = parseJSXIdentifier();

    return markerApply(marker, astNodeFactory.createJSXNamespacedName(namespace, name));
}

function parseJSXMemberExpression() {
    var marker = markerCreate(),
        expr = parseJSXIdentifier();

    while (match(".")) {
        lex();
        expr = markerApply(marker, astNodeFactory.createJSXMemberExpression(expr, parseJSXIdentifier()));
    }

    return expr;
}

function parseJSXElementName() {
    if (lookahead2().value === ":") {
        return parseJSXNamespacedName();
    }
    if (lookahead2().value === ".") {
        return parseJSXMemberExpression();
    }

    return parseJSXIdentifier();
}

function parseJSXAttributeName() {
    if (lookahead2().value === ":") {
        return parseJSXNamespacedName();
    }

    return parseJSXIdentifier();
}

function parseJSXAttributeValue() {
    var value, marker;
    if (match("{")) {
        value = parseJSXExpressionContainer();
        if (value.expression.type === astNodeTypes.JSXEmptyExpression) {
            throwError(
                value,
                "JSX attributes must only be assigned a non-empty " +
                    "expression"
            );
        }
    } else if (match("<")) {
        value = parseJSXElement();
    } else if (lookahead.type === Token.JSXText) {
        marker = markerCreate();
        value = markerApply(marker, astNodeFactory.createLiteralFromSource(lex(), source));
    } else {
        throwError({}, Messages.InvalidJSXAttributeValue);
    }
    return value;
}

function parseJSXEmptyExpression() {
    var marker = markerCreatePreserveWhitespace();
    while (source.charAt(index) !== "}") {
        index++;
    }
    return markerApply(marker, astNodeFactory.createJSXEmptyExpression());
}

function parseJSXExpressionContainer() {
    var expression, origInJSXChild, origInJSXTag, marker = markerCreate();

    origInJSXChild = state.inJSXChild;
    origInJSXTag = state.inJSXTag;
    state.inJSXChild = false;
    state.inJSXTag = false;

    expect("{");

    if (match("}")) {
        expression = parseJSXEmptyExpression();
    } else {
        expression = parseExpression();
    }

    state.inJSXChild = origInJSXChild;
    state.inJSXTag = origInJSXTag;

    expect("}");

    return markerApply(marker, astNodeFactory.createJSXExpressionContainer(expression));
}

function parseJSXSpreadAttribute() {
    var expression, origInJSXChild, origInJSXTag, marker = markerCreate();

    origInJSXChild = state.inJSXChild;
    origInJSXTag = state.inJSXTag;
    state.inJSXChild = false;
    state.inJSXTag = false;
    state.inJSXSpreadAttribute = true;

    expect("{");
    expect("...");

    state.inJSXSpreadAttribute = false;

    expression = parseAssignmentExpression();

    state.inJSXChild = origInJSXChild;
    state.inJSXTag = origInJSXTag;

    expect("}");

    return markerApply(marker, astNodeFactory.createJSXSpreadAttribute(expression));
}

function parseJSXAttribute() {
    var name, marker;

    if (match("{")) {
        return parseJSXSpreadAttribute();
    }

    marker = markerCreate();

    name = parseJSXAttributeName();

    // HTML empty attribute
    if (match("=")) {
        lex();
        return markerApply(marker, astNodeFactory.createJSXAttribute(name, parseJSXAttributeValue()));
    }

    return markerApply(marker, astNodeFactory.createJSXAttribute(name));
}

function parseJSXChild() {
    var token, marker;
    if (match("{")) {
        token = parseJSXExpressionContainer();
    } else if (lookahead.type === Token.JSXText) {
        marker = markerCreatePreserveWhitespace();
        token = markerApply(marker, astNodeFactory.createLiteralFromSource(lex(), source));
    } else {
        token = parseJSXElement();
    }
    return token;
}

function parseJSXClosingElement() {
    var name, origInJSXChild, origInJSXTag, marker = markerCreate();
    origInJSXChild = state.inJSXChild;
    origInJSXTag = state.inJSXTag;
    state.inJSXChild = false;
    state.inJSXTag = true;
    expect("<");
    expect("/");
    name = parseJSXElementName();
    // Because advance() (called by lex() called by expect()) expects there
    // to be a valid token after >, it needs to know whether to look for a
    // standard JS token or an JSX text node
    state.inJSXChild = origInJSXChild;
    state.inJSXTag = origInJSXTag;
    expect(">");
    return markerApply(marker, astNodeFactory.createJSXClosingElement(name));
}

function parseJSXOpeningElement() {
    var name, attributes = [], selfClosing = false, origInJSXChild,
        origInJSXTag, marker = markerCreate();

    origInJSXChild = state.inJSXChild;
    origInJSXTag = state.inJSXTag;
    state.inJSXChild = false;
    state.inJSXTag = true;

    expect("<");

    name = parseJSXElementName();

    while (index < length &&
            lookahead.value !== "/" &&
            lookahead.value !== ">") {
        attributes.push(parseJSXAttribute());
    }

    state.inJSXTag = origInJSXTag;

    if (lookahead.value === "/") {
        expect("/");
        // Because advance() (called by lex() called by expect()) expects
        // there to be a valid token after >, it needs to know whether to
        // look for a standard JS token or an JSX text node
        state.inJSXChild = origInJSXChild;
        expect(">");
        selfClosing = true;
    } else {
        state.inJSXChild = true;
        expect(">");
    }
    return markerApply(marker, astNodeFactory.createJSXOpeningElement(name, attributes, selfClosing));
}

function parseJSXElement() {
    var openingElement, closingElement = null, children = [], origInJSXChild, origInJSXTag, marker = markerCreate();

    origInJSXChild = state.inJSXChild;
    origInJSXTag = state.inJSXTag;
    openingElement = parseJSXOpeningElement();

    if (!openingElement.selfClosing) {
        while (index < length) {
            state.inJSXChild = false; // Call lookahead2() with inJSXChild = false because </ should not be considered in the child
            if (lookahead.value === "<" && lookahead2().value === "/") {
                break;
            }
            state.inJSXChild = true;
            children.push(parseJSXChild());
        }
        state.inJSXChild = origInJSXChild;
        state.inJSXTag = origInJSXTag;
        closingElement = parseJSXClosingElement();
        if (getQualifiedJSXName(closingElement.name) !== getQualifiedJSXName(openingElement.name)) {
            throwError({}, Messages.ExpectedJSXClosingTag, getQualifiedJSXName(openingElement.name));
        }
    }

    /*
     * When (erroneously) writing two adjacent tags like
     *
     *     var x = <div>one</div><div>two</div>;
     *
     * the default error message is a bit incomprehensible. Since it"s
     * rarely (never?) useful to write a less-than sign after an JSX
     * element, we disallow it here in the parser in order to provide a
     * better error message. (In the rare case that the less-than operator
     * was intended, the left tag can be wrapped in parentheses.)
     */
    if (!origInJSXChild && match("<")) {
        throwError(lookahead, Messages.AdjacentJSXElements);
    }

    return markerApply(marker, astNodeFactory.createJSXElement(openingElement, closingElement, children));
}

//------------------------------------------------------------------------------
// Location markers
//------------------------------------------------------------------------------

/**
 * Applies location information to the given node by using the given marker.
 * The marker indicates the point at which the node is said to have to begun
 * in the source code.
 * @param {Object} marker The market to use for the node.
 * @param {ASTNode} node The AST node to apply location information to.
 * @returns {ASTNode} The node that was passed in.
 * @private
 */
function markerApply(marker, node) {

    // add range information to the node if present
    if (extra.range) {
        node.range = [marker.offset, index];
    }

    // add location information the node if present
    if (extra.loc) {
        node.loc = {
            start: {
                line: marker.line,
                column: marker.col
            },
            end: {
                line: lineNumber,
                column: index - lineStart
            }
        };
        // Attach extra.source information to the location, if present
        if (extra.source) {
            node.loc.source = extra.source;
        }
    }

    // attach leading and trailing comments if requested
    if (extra.attachComment) {
        processComment(node);
    }

    return node;
}

/**
 * Creates a location marker in the source code. Location markers are used for
 * tracking where tokens and nodes appear in the source code.
 * @returns {Object} A marker object or undefined if the parser doesn't have
 *      any location information.
 * @private
 */
function markerCreate() {

    if (!extra.loc && !extra.range) {
        return undefined;
    }

    skipComment();

    return {
        offset: index,
        line: lineNumber,
        col: index - lineStart
    };
}

/**
 * Creates a location marker in the source code. Location markers are used for
 * tracking where tokens and nodes appear in the source code. This method
 * doesn't skip comments or extra whitespace which is important for JSX.
 * @returns {Object} A marker object or undefined if the parser doesn't have
 *      any location information.
 * @private
 */
function markerCreatePreserveWhitespace() {

    if (!extra.loc && !extra.range) {
        return undefined;
    }

    return {
        offset: index,
        line: lineNumber,
        col: index - lineStart
    };
}


//------------------------------------------------------------------------------
// Syntax Tree Delegate
//------------------------------------------------------------------------------


function processComment(node) {
    var lastChild,
        trailingComments,
        i;

    if (node.type === astNodeTypes.Program) {
        if (node.body.length > 0) {
            return;
        }
    }

    if (extra.trailingComments.length > 0) {

        /*
         * If the first comment in trailingComments comes after the
         * current node, then we're good - all comments in the array will
         * come after the node and so it's safe to add then as official
         * trailingComments.
         */
        if (extra.trailingComments[0].range[0] >= node.range[1]) {
            trailingComments = extra.trailingComments;
            extra.trailingComments = [];
        } else {

            /*
             * Otherwise, if the first comment doesn't come after the
             * current node, that means we have a mix of leading and trailing
             * comments in the array and that leadingComments contains the
             * same items as trailingComments. Reset trailingComments to
             * zero items and we'll handle this by evaluating leadingComments
             * later.
             */
            extra.trailingComments.length = 0;
        }
    } else {
        if (extra.bottomRightStack.length > 0 &&
                extra.bottomRightStack[extra.bottomRightStack.length - 1].trailingComments &&
                extra.bottomRightStack[extra.bottomRightStack.length - 1].trailingComments[0].range[0] >= node.range[1]) {
            trailingComments = extra.bottomRightStack[extra.bottomRightStack.length - 1].trailingComments;
            delete extra.bottomRightStack[extra.bottomRightStack.length - 1].trailingComments;
        }
    }

    // Eating the stack.
    while (extra.bottomRightStack.length > 0 && extra.bottomRightStack[extra.bottomRightStack.length - 1].range[0] >= node.range[0]) {
        lastChild = extra.bottomRightStack.pop();
    }

    if (lastChild) {
        if (lastChild.leadingComments && lastChild.leadingComments[lastChild.leadingComments.length - 1].range[1] <= node.range[0]) {
            node.leadingComments = lastChild.leadingComments;
            delete lastChild.leadingComments;
        }
    } else if (extra.leadingComments.length > 0) {

        if (extra.leadingComments[extra.leadingComments.length - 1].range[1] <= node.range[0]) {
            node.leadingComments = extra.leadingComments;
            extra.leadingComments = [];
        } else {

            // https://github.com/eslint/espree/issues/2

            /*
             * In special cases, such as return (without a value) and
             * debugger, all comments will end up as leadingComments and
             * will otherwise be eliminated. This extra step runs when the
             * bottomRightStack is empty and there are comments left
             * in leadingComments.
             *
             * This loop figures out the stopping point between the actual
             * leading and trailing comments by finding the location of the
             * first comment that comes after the given node.
             */
            for (i = 0; i < extra.leadingComments.length; i++) {
                if (extra.leadingComments[i].range[1] > node.range[0]) {
                    break;
                }
            }

            /*
             * Split the array based on the location of the first comment
             * that comes after the node. Keep in mind that this could
             * result in an empty array, and if so, the array must be
             * deleted.
             */
            node.leadingComments = extra.leadingComments.slice(0, i);
            if (node.leadingComments.length === 0) {
                delete node.leadingComments;
            }

            /*
             * Similarly, trailing comments are attached later. The variable
             * must be reset to null if there are no trailing comments.
             */
            trailingComments = extra.leadingComments.slice(i);
            if (trailingComments.length === 0) {
                trailingComments = null;
            }
        }
    }

    if (trailingComments) {
        node.trailingComments = trailingComments;
    }

    extra.bottomRightStack.push(node);
}

// Return true if there is a line terminator before the next token.

function peekLineTerminator() {
    var pos, line, start, found;

    pos = index;
    line = lineNumber;
    start = lineStart;
    skipComment();
    found = lineNumber !== line;
    index = pos;
    lineNumber = line;
    lineStart = start;

    return found;
}

// Throw an exception

function throwError(token, messageFormat) {
    var error,
        args = Array.prototype.slice.call(arguments, 2),
        msg = messageFormat.replace(
            /%(\d)/g,
            function (whole, index) {
                assert(index < args.length, "Message reference must be in range");
                return args[index];
            }
        );

    if (typeof token.lineNumber === "number") {
        error = new Error("Line " + token.lineNumber + ": " + msg);
        error.index = token.range[0];
        error.lineNumber = token.lineNumber;
        error.column = token.range[0] - lineStart + 1;
    } else {
        error = new Error("Line " + lineNumber + ": " + msg);
        error.index = index;
        error.lineNumber = lineNumber;
        error.column = index - lineStart + 1;
    }

    error.description = msg;
    throw error;
}

function throwErrorTolerant() {
    try {
        throwError.apply(null, arguments);
    } catch (e) {
        if (extra.errors) {
            extra.errors.push(e);
        } else {
            throw e;
        }
    }
}


// Throw an exception because of the token.

function throwUnexpected(token) {

    if (token.type === Token.EOF) {
        throwError(token, Messages.UnexpectedEOS);
    }

    if (token.type === Token.NumericLiteral) {
        throwError(token, Messages.UnexpectedNumber);
    }

    if (token.type === Token.StringLiteral || token.type === Token.JSXText) {
        throwError(token, Messages.UnexpectedString);
    }

    if (token.type === Token.Identifier) {
        throwError(token, Messages.UnexpectedIdentifier);
    }

    if (token.type === Token.Keyword) {
        if (syntax.isFutureReservedWord(token.value)) {
            throwError(token, Messages.UnexpectedReserved);
        } else if (strict && syntax.isStrictModeReservedWord(token.value)) {
            throwErrorTolerant(token, Messages.StrictReservedWord);
            return;
        }
        throwError(token, Messages.UnexpectedToken, token.value);
    }

    if (token.type === Token.Template) {
        throwError(token, Messages.UnexpectedTemplate, token.value.raw);
    }

    // BooleanLiteral, NullLiteral, or Punctuator.
    throwError(token, Messages.UnexpectedToken, token.value);
}

// Expect the next token to match the specified punctuator.
// If not, an exception will be thrown.

function expect(value) {
    var token = lex();
    if (token.type !== Token.Punctuator || token.value !== value) {
        throwUnexpected(token);
    }
}

// Expect the next token to match the specified keyword.
// If not, an exception will be thrown.

function expectKeyword(keyword) {
    var token = lex();
    if (token.type !== Token.Keyword || token.value !== keyword) {
        throwUnexpected(token);
    }
}

// Return true if the next token matches the specified punctuator.

function match(value) {
    return lookahead.type === Token.Punctuator && lookahead.value === value;
}

// Return true if the next token matches the specified keyword

function matchKeyword(keyword) {
    return lookahead.type === Token.Keyword && lookahead.value === keyword;
}

// Return true if the next token matches the specified contextual keyword
// (where an identifier is sometimes a keyword depending on the context)

function matchContextualKeyword(keyword) {
    return lookahead.type === Token.Identifier && lookahead.value === keyword;
}

// Return true if the next token is an assignment operator

function matchAssign() {
    var op;

    if (lookahead.type !== Token.Punctuator) {
        return false;
    }
    op = lookahead.value;
    return op === "=" ||
        op === "*=" ||
        op === "/=" ||
        op === "%=" ||
        op === "+=" ||
        op === "-=" ||
        op === "<<=" ||
        op === ">>=" ||
        op === ">>>=" ||
        op === "&=" ||
        op === "^=" ||
        op === "|=";
}

function consumeSemicolon() {
    var line;

    // Catch the very common case first: immediately a semicolon (U+003B).
    if (source.charCodeAt(index) === 0x3B || match(";")) {
        lex();
        return;
    }

    line = lineNumber;
    skipComment();
    if (lineNumber !== line) {
        return;
    }

    if (lookahead.type !== Token.EOF && !match("}")) {
        throwUnexpected(lookahead);
    }
}

// Return true if provided expression is LeftHandSideExpression

function isLeftHandSide(expr) {
    return expr.type === astNodeTypes.Identifier || expr.type === astNodeTypes.MemberExpression;
}

// 11.1.4 Array Initialiser

function parseArrayInitialiser() {
    var elements = [],
        marker = markerCreate(),
        tmp;

    expect("[");

    while (!match("]")) {
        if (match(",")) {
            lex(); // only get here when you have [a,,] or similar
            elements.push(null);
        } else {
            tmp = parseSpreadOrAssignmentExpression();
            elements.push(tmp);
            if (tmp && tmp.type === astNodeTypes.SpreadElement) {
                if (!match("]")) {
                    throwError({}, Messages.ElementAfterSpreadElement);
                }
            } else if (!(match("]"))) {
                expect(","); // handles the common case of comma-separated values
            }
        }
    }

    expect("]");

    return markerApply(marker, astNodeFactory.createArrayExpression(elements));
}

// 11.1.5 Object Initialiser

function parsePropertyFunction(options) {
    var previousStrict = strict,
        previousYieldAllowed = state.yieldAllowed,
        params = options.params || [],
        defaults = options.defaults || [],
        body;

    state.yieldAllowed = options.generator;

    /*
     * Esprima uses parseConciseBody() here, which is incorrect. Object literal
     * methods must have braces.
     */
    body = parseFunctionSourceElements();

    if (options.name && strict && syntax.isRestrictedWord(params[0].name)) {
        throwErrorTolerant(options.name, Messages.StrictParamName);
    }

    strict = previousStrict;
    state.yieldAllowed = previousYieldAllowed;

    return markerApply(options.marker, astNodeFactory.createFunctionExpression(
        null,
        params,
        defaults,
        body,
        options.rest || null,
        options.generator,
        body.type !== astNodeTypes.BlockStatement
    ));
}

function parsePropertyMethodFunction(options) {
    var previousStrict = strict,
        marker = markerCreate(),
        tmp,
        method;

    strict = true;

    tmp = parseParams();

    if (tmp.stricted) {
        throwErrorTolerant(tmp.stricted, tmp.message);
    }

    method = parsePropertyFunction({
        params: tmp.params,
        defaults: tmp.defaults,
        rest: tmp.rest,
        generator: options ? options.generator : false,
        marker: marker
    });

    strict = previousStrict;

    return method;
}

function parseObjectPropertyKey() {
    var marker = markerCreate(),
        token = lex(),
        propertyKey,
        result;

    // Note: This function is called only from parseObjectProperty(), where
    // EOF and Punctuator tokens are already filtered out.

    if (token.type === Token.StringLiteral || token.type === Token.NumericLiteral) {
        if (strict && token.octal) {
            throwErrorTolerant(token, Messages.StrictOctalLiteral);
        }
        return markerApply(marker, astNodeFactory.createLiteralFromSource(token, source));
    }

    if (extra.ecmaFeatures.objectLiteralComputedProperties &&
        token.type === Token.Punctuator && token.value === "["
    ) {
        // For computed properties we should skip the [ and ], and
        // capture in marker only the assignment expression itself.
        marker = markerCreate();
        propertyKey = parseAssignmentExpression();
        result = markerApply(marker, propertyKey);
        expect("]");
        return result;
    }

    return markerApply(marker, astNodeFactory.createIdentifier(token.value));
}

function parseObjectProperty() {
    var token, key, id, param, computed, methodMarker;
    var allowComputed = extra.ecmaFeatures.objectLiteralComputedProperties,
        allowMethod = extra.ecmaFeatures.objectLiteralShorthandMethods,
        allowShorthand = extra.ecmaFeatures.objectLiteralShorthandProperties,
        allowGenerators = extra.ecmaFeatures.generators,
        allowDestructuring = extra.ecmaFeatures.destructuring,
        marker = markerCreate();

    token = lookahead;
    computed = (token.value === "[" && token.type === Token.Punctuator);

    if (token.type === Token.Identifier || (allowComputed && computed)) {

        id = parseObjectPropertyKey();

        /*
         * Check for getters and setters. Be careful! "get" and "set" are legal
         * method names. It's only a getter or setter if followed by a space.
         */
        if (token.value === "get" && !(match(":") || match("("))) {
            computed = (lookahead.value === "[");
            key = parseObjectPropertyKey();
            methodMarker = markerCreate();
            expect("(");
            expect(")");
            return markerApply(
                marker,
                astNodeFactory.createProperty(
                    "get",
                    key,
                    parsePropertyFunction({
                        generator: false,
                        marker: methodMarker
                    }),
                    false,
                    false,
                    computed
                )
            );
        }

        if (token.value === "set" && !(match(":") || match("("))) {
            computed = (lookahead.value === "[");
            key = parseObjectPropertyKey();
            methodMarker = markerCreate();
            expect("(");
            token = lookahead;
            param = [ parseVariableIdentifier() ];
            expect(")");
            return markerApply(
                marker,
                astNodeFactory.createProperty(
                    "set",
                    key,
                    parsePropertyFunction({
                        params: param,
                        generator: false,
                        name: token,
                        marker: methodMarker
                    }),
                    false,
                    false,
                    computed
                )
            );
        }

        // normal property (key:value)
        if (match(":")) {
            lex();
            return markerApply(
                marker,
                astNodeFactory.createProperty(
                    "init",
                    id,
                    parseAssignmentExpression(),
                    false,
                    false,
                    computed
                )
            );
        }

        // method shorthand (key(){...})
        if (allowMethod && match("(")) {
            return markerApply(
                marker,
                astNodeFactory.createProperty(
                    "init",
                    id,
                    parsePropertyMethodFunction({ generator: false }),
                    true,
                    false,
                    computed
                )
            );
        }

        /*
         * Only other possibility is that this is a shorthand property. Computed
         * properties cannot use shorthand notation, so that's a syntax error.
         * If shorthand properties aren't allow, then this is an automatic
         * syntax error. Destructuring is another case with a similar shorthand syntax.
         */
        if (computed || (!allowShorthand && !allowDestructuring)) {
            throwUnexpected(lookahead);
        }

        // shorthand property
        return markerApply(
            marker,
            astNodeFactory.createProperty(
                "init",
                id,
                id,
                false,
                true,
                false
            )
        );
    }

    // only possibility in this branch is a generator
    if (token.type === Token.EOF || token.type === Token.Punctuator) {
        if (!allowGenerators || !match("*")) {
            throwUnexpected(token);
        }
        lex();

        computed = (lookahead.type === Token.Punctuator && lookahead.value === "[");

        id = parseObjectPropertyKey();

        if (!match("(")) {
            throwUnexpected(lex());
        }

        return markerApply(
            marker,
            astNodeFactory.createProperty(
                "init",
                id,
                parsePropertyMethodFunction({ generator: true }),
                true,
                false,
                computed
            )
        );

    }

    /*
     * If we've made it here, then that means the property name is represented
     * by a string (i.e, { "foo": 2}). The only options here are normal
     * property with a colon or a method.
     */
    key = parseObjectPropertyKey();

    // check for property value
    if (match(":")) {
        lex();
        return markerApply(
            marker,
            astNodeFactory.createProperty(
                "init",
                key,
                parseAssignmentExpression(),
                false,
                false,
                false
            )
        );
    }

    // check for method
    if (allowMethod && match("(")) {
        return markerApply(
            marker,
            astNodeFactory.createProperty(
                "init",
                key,
                parsePropertyMethodFunction(),
                true,
                false,
                false
            )
        );
    }

    // no other options, this is bad
    throwUnexpected(lex());
}

function getFieldName(key) {
    var toString = String;
    if (key.type === astNodeTypes.Identifier) {
        return key.name;
    }
    return toString(key.value);
}

function parseObjectInitialiser() {
    var marker = markerCreate(),
        allowDuplicates = extra.ecmaFeatures.objectLiteralDuplicateProperties,
        properties = [],
        property,
        name,
        propertyFn,
        kind,
        storedKind,
        kindMap = new StringMap();

    expect("{");

    while (!match("}")) {

        property = parseObjectProperty();

        if (!property.computed) {

            name = getFieldName(property.key);
            propertyFn = (property.kind === "get") ? PropertyKind.Get : PropertyKind.Set;
            kind = (property.kind === "init") ? PropertyKind.Data : propertyFn;

            if (kindMap.has(name)) {
                storedKind = kindMap.get(name);
                if (storedKind === PropertyKind.Data) {
                    if (kind === PropertyKind.Data && name === "__proto__" && allowDuplicates) {
                        // Duplicate '__proto__' literal properties are forbidden in ES 6
                        throwErrorTolerant({}, Messages.DuplicatePrototypeProperty);
                    } else if (strict && kind === PropertyKind.Data && !allowDuplicates) {
                        // Duplicate literal properties are only forbidden in ES 5 strict mode
                        throwErrorTolerant({}, Messages.StrictDuplicateProperty);
                    } else if (kind !== PropertyKind.Data) {
                        throwErrorTolerant({}, Messages.AccessorDataProperty);
                    }
                } else {
                    if (kind === PropertyKind.Data) {
                        throwErrorTolerant({}, Messages.AccessorDataProperty);
                    } else if (storedKind & kind) {
                        throwErrorTolerant({}, Messages.AccessorGetSet);
                    }
                }
                kindMap.set(name, storedKind | kind);
            } else {
                kindMap.set(name, kind);
            }
        }

        properties.push(property);

        if (!match("}")) {
            expect(",");
        }
    }

    expect("}");

    return markerApply(marker, astNodeFactory.createObjectExpression(properties));
}

/**
 * Parse a template string element and return its ASTNode representation
 * @param {Object} options Parsing & scanning options
 * @param {Object} options.head True if this element is the first in the
 *                               template string, false otherwise.
 * @returns {ASTNode} The template element node with marker info applied
 * @private
 */
function parseTemplateElement(options) {
    var marker = markerCreate(),
        token = scanTemplateElement(options);
    if (strict && token.octal) {
        throwError(token, Messages.StrictOctalLiteral);
    }
    return markerApply(marker, astNodeFactory.createTemplateElement({ raw: token.value.raw, cooked: token.value.cooked }, token.tail));
}

/**
 * Parse a template string literal and return its ASTNode representation
 * @returns {ASTNode} The template literal node with marker info applied
 * @private
 */
function parseTemplateLiteral() {
    var quasi, quasis, expressions, marker = markerCreate();

    quasi = parseTemplateElement({ head: true });
    quasis = [ quasi ];
    expressions = [];

    while (!quasi.tail) {
        expressions.push(parseExpression());
        quasi = parseTemplateElement({ head: false });
        quasis.push(quasi);
    }

    return markerApply(marker, astNodeFactory.createTemplateLiteral(quasis, expressions));
}

// 11.1.6 The Grouping Operator

function parseGroupExpression() {
    var expr;

    expect("(");

    ++state.parenthesisCount;

    expr = parseExpression();

    expect(")");

    return expr;
}


// 11.1 Primary Expressions

function parsePrimaryExpression() {
    var type, token, expr,
        marker,
        allowJSX = extra.ecmaFeatures.jsx,
        allowSuper = extra.ecmaFeatures.superInFunctions;

    if (match("(")) {
        return parseGroupExpression();
    }

    if (match("[")) {
        return parseArrayInitialiser();
    }

    if (match("{")) {
        return parseObjectInitialiser();
    }

    if (allowJSX && match("<")) {
        return parseJSXElement();
    }

    type = lookahead.type;
    marker = markerCreate();

    if (type === Token.Identifier) {
        expr = astNodeFactory.createIdentifier(lex().value);
    } else if (type === Token.StringLiteral || type === Token.NumericLiteral) {
        if (strict && lookahead.octal) {
            throwErrorTolerant(lookahead, Messages.StrictOctalLiteral);
        }
        expr = astNodeFactory.createLiteralFromSource(lex(), source);
    } else if (type === Token.Keyword) {
        if (matchKeyword("function")) {
            return parseFunctionExpression();
        }

        if (allowSuper && matchKeyword("super") && state.inFunctionBody) {
            marker = markerCreate();
            lex();
            return markerApply(marker, astNodeFactory.createIdentifier("super"));
        }

        if (matchKeyword("this")) {
            lex();
            expr = astNodeFactory.createThisExpression();
        } else {
            throwUnexpected(lex());
        }
    } else if (type === Token.BooleanLiteral) {
        token = lex();
        token.value = (token.value === "true");
        expr = astNodeFactory.createLiteralFromSource(token, source);
    } else if (type === Token.NullLiteral) {
        token = lex();
        token.value = null;
        expr = astNodeFactory.createLiteralFromSource(token, source);
    } else if (match("/") || match("/=")) {
        if (typeof extra.tokens !== "undefined") {
            expr = astNodeFactory.createLiteralFromSource(collectRegex(), source);
        } else {
            expr = astNodeFactory.createLiteralFromSource(scanRegExp(), source);
        }
        peek();
    } else if (type === Token.Template) {
        return parseTemplateLiteral();
    } else {
       throwUnexpected(lex());
    }

    return markerApply(marker, expr);
}

// 11.2 Left-Hand-Side Expressions

function parseArguments() {
    var args = [], arg;

    expect("(");

    if (!match(")")) {
        while (index < length) {
            arg = parseSpreadOrAssignmentExpression();
            args.push(arg);

            if (match(")")) {
                break;
            } else if (arg.type === astNodeTypes.SpreadElement) {
                throwError({}, Messages.ElementAfterSpreadElement);
            }

            expect(",");
        }
    }

    expect(")");

    return args;
}

function parseSpreadOrAssignmentExpression() {
    if (match("...")) {
        var marker = markerCreate();
        lex();
        return markerApply(marker, astNodeFactory.createSpreadElement(parseAssignmentExpression()));
    }
    return parseAssignmentExpression();
}

function parseNonComputedProperty() {
    var token,
        marker = markerCreate();

    token = lex();

    if (!isIdentifierName(token)) {
        throwUnexpected(token);
    }

    return markerApply(marker, astNodeFactory.createIdentifier(token.value));
}

function parseNonComputedMember() {
    expect(".");

    return parseNonComputedProperty();
}

function parseComputedMember() {
    var expr;

    expect("[");

    expr = parseExpression();

    expect("]");

    return expr;
}

function parseNewExpression() {
    var callee, args,
        marker = markerCreate();

    expectKeyword("new");
    callee = parseLeftHandSideExpression();
    args = match("(") ? parseArguments() : [];

    return markerApply(marker, astNodeFactory.createNewExpression(callee, args));
}

function parseLeftHandSideExpressionAllowCall() {
    var expr, args,
        previousAllowIn = state.allowIn,
        marker = markerCreate();

    state.allowIn = true;
    expr = matchKeyword("new") ? parseNewExpression() : parsePrimaryExpression();
    state.allowIn = previousAllowIn;

    // only start parsing template literal if the lookahead is a head (beginning with `)
    while (match(".") || match("[") || match("(") || (lookahead.type === Token.Template && lookahead.head)) {
        if (match("(")) {
            args = parseArguments();
            expr = markerApply(marker, astNodeFactory.createCallExpression(expr, args));
        } else if (match("[")) {
            expr = markerApply(marker, astNodeFactory.createMemberExpression("[", expr, parseComputedMember()));
        } else if (match(".")) {
            expr = markerApply(marker, astNodeFactory.createMemberExpression(".", expr, parseNonComputedMember()));
        } else if (!lookahead.tail) {
            expr = markerApply(marker, astNodeFactory.createTaggedTemplateExpression(expr, parseTemplateLiteral()));
        }
    }

    return expr;
}

function parseLeftHandSideExpression() {
    var expr,
        previousAllowIn = state.allowIn,
        marker = markerCreate();

    expr = matchKeyword("new") ? parseNewExpression() : parsePrimaryExpression();
    state.allowIn = previousAllowIn;

    // only start parsing template literal if the lookahead is a head (beginning with `)
    while (match(".") || match("[") || (lookahead.type === Token.Template && lookahead.head)) {
        if (match("[")) {
            expr = markerApply(marker, astNodeFactory.createMemberExpression("[", expr, parseComputedMember()));
        } else if (match(".")) {
            expr = markerApply(marker, astNodeFactory.createMemberExpression(".", expr, parseNonComputedMember()));
        } else {
            expr = markerApply(marker, astNodeFactory.createTaggedTemplateExpression(expr, parseTemplateLiteral()));
        }
    }

    return expr;
}


// 11.3 Postfix Expressions

function parsePostfixExpression() {
    var expr, token,
        marker = markerCreate();

    expr = parseLeftHandSideExpressionAllowCall();

    if (lookahead.type === Token.Punctuator) {
        if ((match("++") || match("--")) && !peekLineTerminator()) {
            // 11.3.1, 11.3.2
            if (strict && expr.type === astNodeTypes.Identifier && syntax.isRestrictedWord(expr.name)) {
                throwErrorTolerant({}, Messages.StrictLHSPostfix);
            }

            if (!isLeftHandSide(expr)) {
                throwErrorTolerant({}, Messages.InvalidLHSInAssignment);
            }

            token = lex();
            expr = markerApply(marker, astNodeFactory.createPostfixExpression(token.value, expr));
        }
    }

    return expr;
}

// 11.4 Unary Operators

function parseUnaryExpression() {
    var token, expr,
        marker;

    if (lookahead.type !== Token.Punctuator && lookahead.type !== Token.Keyword) {
        expr = parsePostfixExpression();
    } else if (match("++") || match("--")) {
        marker = markerCreate();
        token = lex();
        expr = parseUnaryExpression();
        // 11.4.4, 11.4.5
        if (strict && expr.type === astNodeTypes.Identifier && syntax.isRestrictedWord(expr.name)) {
            throwErrorTolerant({}, Messages.StrictLHSPrefix);
        }

        if (!isLeftHandSide(expr)) {
            throwErrorTolerant({}, Messages.InvalidLHSInAssignment);
        }

        expr = astNodeFactory.createUnaryExpression(token.value, expr);
        expr = markerApply(marker, expr);
    } else if (match("+") || match("-") || match("~") || match("!")) {
        marker = markerCreate();
        token = lex();
        expr = parseUnaryExpression();
        expr = astNodeFactory.createUnaryExpression(token.value, expr);
        expr = markerApply(marker, expr);
    } else if (matchKeyword("delete") || matchKeyword("void") || matchKeyword("typeof")) {
        marker = markerCreate();
        token = lex();
        expr = parseUnaryExpression();
        expr = astNodeFactory.createUnaryExpression(token.value, expr);
        expr = markerApply(marker, expr);
        if (strict && expr.operator === "delete" && expr.argument.type === astNodeTypes.Identifier) {
            throwErrorTolerant({}, Messages.StrictDelete);
        }
    } else {
        expr = parsePostfixExpression();
    }

    return expr;
}

function binaryPrecedence(token, allowIn) {
    var prec = 0;

    if (token.type !== Token.Punctuator && token.type !== Token.Keyword) {
        return 0;
    }

    switch (token.value) {
    case "||":
        prec = 1;
        break;

    case "&&":
        prec = 2;
        break;

    case "|":
        prec = 3;
        break;

    case "^":
        prec = 4;
        break;

    case "&":
        prec = 5;
        break;

    case "==":
    case "!=":
    case "===":
    case "!==":
        prec = 6;
        break;

    case "<":
    case ">":
    case "<=":
    case ">=":
    case "instanceof":
        prec = 7;
        break;

    case "in":
        prec = allowIn ? 7 : 0;
        break;

    case "<<":
    case ">>":
    case ">>>":
        prec = 8;
        break;

    case "+":
    case "-":
        prec = 9;
        break;

    case "*":
    case "/":
    case "%":
        prec = 11;
        break;

    default:
        break;
    }

    return prec;
}

// 11.5 Multiplicative Operators
// 11.6 Additive Operators
// 11.7 Bitwise Shift Operators
// 11.8 Relational Operators
// 11.9 Equality Operators
// 11.10 Binary Bitwise Operators
// 11.11 Binary Logical Operators
function parseBinaryExpression() {
    var expr, token, prec, previousAllowIn, stack, right, operator, left, i,
        marker, markers;

    previousAllowIn = state.allowIn;
    state.allowIn = true;

    marker = markerCreate();
    left = parseUnaryExpression();

    token = lookahead;
    prec = binaryPrecedence(token, previousAllowIn);
    if (prec === 0) {
        return left;
    }
    token.prec = prec;
    lex();

    markers = [marker, markerCreate()];
    right = parseUnaryExpression();

    stack = [left, token, right];

    while ((prec = binaryPrecedence(lookahead, previousAllowIn)) > 0) {

        // Reduce: make a binary expression from the three topmost entries.
        while ((stack.length > 2) && (prec <= stack[stack.length - 2].prec)) {
            right = stack.pop();
            operator = stack.pop().value;
            left = stack.pop();
            expr = astNodeFactory.createBinaryExpression(operator, left, right);
            markers.pop();
            marker = markers.pop();
            markerApply(marker, expr);
            stack.push(expr);
            markers.push(marker);
        }

        // Shift.
        token = lex();
        token.prec = prec;
        stack.push(token);
        markers.push(markerCreate());
        expr = parseUnaryExpression();
        stack.push(expr);
    }

    state.allowIn = previousAllowIn;

    // Final reduce to clean-up the stack.
    i = stack.length - 1;
    expr = stack[i];
    markers.pop();
    while (i > 1) {
        expr = astNodeFactory.createBinaryExpression(stack[i - 1].value, stack[i - 2], expr);
        i -= 2;
        marker = markers.pop();
        markerApply(marker, expr);
    }

    return expr;
}

// 11.12 Conditional Operator

function parseConditionalExpression() {
    var expr, previousAllowIn, consequent, alternate,
        marker = markerCreate();

    expr = parseBinaryExpression();

    if (match("?")) {
        lex();
        previousAllowIn = state.allowIn;
        state.allowIn = true;
        consequent = parseAssignmentExpression();
        state.allowIn = previousAllowIn;
        expect(":");
        alternate = parseAssignmentExpression();

        expr = astNodeFactory.createConditionalExpression(expr, consequent, alternate);
        markerApply(marker, expr);
    }

    return expr;
}

// [ES6] 14.2 Arrow Function

function parseConciseBody() {
    if (match("{")) {
        return parseFunctionSourceElements();
    }
    return parseAssignmentExpression();
}

function reinterpretAsCoverFormalsList(expressions) {
    var i, len, param, params, defaults, defaultCount, options, rest;

    params = [];
    defaults = [];
    defaultCount = 0;
    rest = null;
    options = {
        paramSet: new StringMap()
    };

    for (i = 0, len = expressions.length; i < len; i += 1) {
        param = expressions[i];
        if (param.type === astNodeTypes.Identifier) {
            params.push(param);
            defaults.push(null);
            validateParam(options, param, param.name);
        }  else if (param.type === astNodeTypes.ObjectExpression || param.type === astNodeTypes.ArrayExpression) {
            reinterpretAsDestructuredParameter(options, param);
            params.push(param);
            defaults.push(null);
        } else if (param.type === astNodeTypes.SpreadElement) {
            assert(i === len - 1, "It is guaranteed that SpreadElement is last element by parseExpression");
            if (param.argument.type !== astNodeTypes.Identifier) {
                throwError({}, Messages.InvalidLHSInFormalsList);
            }
            reinterpretAsDestructuredParameter(options, param.argument);
            rest = param.argument;
        } else if (param.type === astNodeTypes.AssignmentExpression) {
            params.push(param.left);
            defaults.push(param.right);
            ++defaultCount;
            validateParam(options, param.left, param.left.name);
        } else {
            return null;
        }
    }

    if (options.message === Messages.StrictParamDupe) {
        throwError(
            strict ? options.stricted : options.firstRestricted,
            options.message
        );
    }

    // must be here so it's not an array of [null, null]
    if (defaultCount === 0) {
        defaults = [];
    }

    return {
        params: params,
        defaults: defaults,
        rest: rest,
        stricted: options.stricted,
        firstRestricted: options.firstRestricted,
        message: options.message
    };
}

function parseArrowFunctionExpression(options, marker) {
    var previousStrict, body;

    expect("=>");
    previousStrict = strict;

    body = parseConciseBody();

    if (strict && options.firstRestricted) {
        throwError(options.firstRestricted, options.message);
    }
    if (strict && options.stricted) {
        throwErrorTolerant(options.stricted, options.message);
    }

    strict = previousStrict;
    return markerApply(marker, astNodeFactory.createArrowFunctionExpression(
        options.params,
        options.defaults,
        body,
        options.rest,
        body.type !== astNodeTypes.BlockStatement
    ));
}

// 11.13 Assignment Operators

// 12.14.5 AssignmentPattern

function reinterpretAsAssignmentBindingPattern(expr) {
    var i, len, property, element,
        allowDestructuring = extra.ecmaFeatures.destructuring;

    if (!allowDestructuring) {
        throwUnexpected(lex());
    }

    if (expr.type === astNodeTypes.ObjectExpression) {
        expr.type = astNodeTypes.ObjectPattern;
        for (i = 0, len = expr.properties.length; i < len; i += 1) {
            property = expr.properties[i];
            if (property.kind !== "init") {
                throwErrorTolerant({}, Messages.InvalidLHSInAssignment);
            }
            reinterpretAsAssignmentBindingPattern(property.value);
        }
    } else if (expr.type === astNodeTypes.ArrayExpression) {
        expr.type = astNodeTypes.ArrayPattern;
        for (i = 0, len = expr.elements.length; i < len; i += 1) {
            element = expr.elements[i];
            /* istanbul ignore else */
            if (element) {
                reinterpretAsAssignmentBindingPattern(element);
            }
        }
    } else if (expr.type === astNodeTypes.Identifier) {
        if (syntax.isRestrictedWord(expr.name)) {
            throwErrorTolerant({}, Messages.InvalidLHSInAssignment);
        }
    } else if (expr.type === astNodeTypes.SpreadElement) {
        reinterpretAsAssignmentBindingPattern(expr.argument);
        if (expr.argument.type === astNodeTypes.ObjectPattern) {
            throwErrorTolerant({}, Messages.ObjectPatternAsSpread);
        }
    } else {
        /* istanbul ignore else */
        if (expr.type !== astNodeTypes.MemberExpression && expr.type !== astNodeTypes.CallExpression && expr.type !== astNodeTypes.NewExpression) {
            throwErrorTolerant({}, Messages.InvalidLHSInAssignment);
        }
    }
}

// 13.2.3 BindingPattern

function reinterpretAsDestructuredParameter(options, expr) {
    var i, len, property, element,
        allowDestructuring = extra.ecmaFeatures.destructuring;

    if (!allowDestructuring) {
        throwUnexpected(lex());
    }

    if (expr.type === astNodeTypes.ObjectExpression) {
        expr.type = astNodeTypes.ObjectPattern;
        for (i = 0, len = expr.properties.length; i < len; i += 1) {
            property = expr.properties[i];
            if (property.kind !== "init") {
                throwErrorTolerant({}, Messages.InvalidLHSInFormalsList);
            }
            reinterpretAsDestructuredParameter(options, property.value);
        }
    } else if (expr.type === astNodeTypes.ArrayExpression) {
        expr.type = astNodeTypes.ArrayPattern;
        for (i = 0, len = expr.elements.length; i < len; i += 1) {
            element = expr.elements[i];
            if (element) {
                reinterpretAsDestructuredParameter(options, element);
            }
        }
    } else if (expr.type === astNodeTypes.Identifier) {
        validateParam(options, expr, expr.name);
    } else if (expr.type === astNodeTypes.SpreadElement) {
        // BindingRestElement only allows BindingIdentifier
        if (expr.argument.type !== astNodeTypes.Identifier) {
            throwErrorTolerant({}, Messages.InvalidLHSInFormalsList);
        }
        validateParam(options, expr.argument, expr.argument.name);
    } else {
        throwError({}, Messages.InvalidLHSInFormalsList);
    }
}

function parseAssignmentExpression() {
    var token, left, right, node, params,
        marker,
        startsWithParen = false,
        oldParenthesisCount = state.parenthesisCount,
        allowGenerators = extra.ecmaFeatures.generators;

    // Note that 'yield' is treated as a keyword in strict mode, but a
    // contextual keyword (identifier) in non-strict mode, so we need
    // to use matchKeyword and matchContextualKeyword appropriately.
    if (allowGenerators && ((state.yieldAllowed && matchContextualKeyword("yield")) || (strict && matchKeyword("yield")))) {
        return parseYieldExpression();
    }

    marker = markerCreate();

    if (match("(")) {
        token = lookahead2();
        if ((token.value === ")" && token.type === Token.Punctuator) || token.value === "...") {
            params = parseParams();
            if (!match("=>")) {
                throwUnexpected(lex());
            }
            return parseArrowFunctionExpression(params, marker);
        }
        startsWithParen = true;
    }

    // revert to the previous lookahead style object
    token = lookahead;
    node = left = parseConditionalExpression();

    if (match("=>") &&
            (state.parenthesisCount === oldParenthesisCount ||
            state.parenthesisCount === (oldParenthesisCount + 1))) {

        if (node.type === astNodeTypes.Identifier) {
            params = reinterpretAsCoverFormalsList([ node ]);
        } else if (node.type === astNodeTypes.AssignmentExpression ||
            node.type === astNodeTypes.ArrayExpression ||
            node.type === astNodeTypes.ObjectExpression) {
            if (!startsWithParen) {
                throwUnexpected(lex());
            }
            params = reinterpretAsCoverFormalsList([ node ]);
        } else if (node.type === astNodeTypes.SequenceExpression) {
            params = reinterpretAsCoverFormalsList(node.expressions);
        }

        if (params) {
            return parseArrowFunctionExpression(params, marker);
        }
    }

    if (matchAssign()) {

        // 11.13.1
        if (strict && left.type === astNodeTypes.Identifier && syntax.isRestrictedWord(left.name)) {
            throwErrorTolerant(token, Messages.StrictLHSAssignment);
        }

        // ES.next draf 11.13 Runtime Semantics step 1
        if (match("=") && (node.type === astNodeTypes.ObjectExpression || node.type === astNodeTypes.ArrayExpression)) {
            reinterpretAsAssignmentBindingPattern(node);
        } else if (!isLeftHandSide(node)) {
            throwErrorTolerant({}, Messages.InvalidLHSInAssignment);
        }

        token = lex();
        right = parseAssignmentExpression();
        node = markerApply(marker, astNodeFactory.createAssignmentExpression(token.value, left, right));
    }

    return node;
}

// 11.14 Comma Operator

function parseExpression() {
    var marker = markerCreate(),
        expr = parseAssignmentExpression(),
        expressions = [ expr ],
        sequence, spreadFound;

    if (match(",")) {
        while (index < length) {
            if (!match(",")) {
                break;
            }
            lex();
            expr = parseSpreadOrAssignmentExpression();
            expressions.push(expr);

            if (expr.type === astNodeTypes.SpreadElement) {
                spreadFound = true;
                if (!match(")")) {
                    throwError({}, Messages.ElementAfterSpreadElement);
                }
                break;
            }
        }

        sequence = markerApply(marker, astNodeFactory.createSequenceExpression(expressions));
    }

    if (spreadFound && lookahead2().value !== "=>") {
        throwError({}, Messages.IllegalSpread);
    }

    return sequence || expr;
}

// 12.1 Block

function parseStatementList() {
    var list = [],
        statement;

    while (index < length) {
        if (match("}")) {
            break;
        }
        statement = parseSourceElement();
        if (typeof statement === "undefined") {
            break;
        }
        list.push(statement);
    }

    return list;
}

function parseBlock() {
    var block,
        marker = markerCreate();

    expect("{");

    block = parseStatementList();

    expect("}");

    return markerApply(marker, astNodeFactory.createBlockStatement(block));
}

// 12.2 Variable Statement

function parseVariableIdentifier() {
    var token,
        marker = markerCreate();

    token = lex();

    if (token.type !== Token.Identifier) {
        throwUnexpected(token);
    }

    return markerApply(marker, astNodeFactory.createIdentifier(token.value));
}

function parseVariableDeclaration(kind) {
    var id,
        marker = markerCreate(),
        init = null;
    if (match("{")) {
        id = parseObjectInitialiser();
        reinterpretAsAssignmentBindingPattern(id);
    } else if (match("[")) {
        id = parseArrayInitialiser();
        reinterpretAsAssignmentBindingPattern(id);
    } else {
        /* istanbul ignore next */
        id = state.allowKeyword ? parseNonComputedProperty() : parseVariableIdentifier();
        // 12.2.1
        if (strict && syntax.isRestrictedWord(id.name)) {
            throwErrorTolerant({}, Messages.StrictVarName);
        }
    }

    // TODO: Verify against feature flags
    if (kind === "const") {
        if (!match("=")) {
            throwError({}, Messages.NoUnintializedConst);
        }
        expect("=");
        init = parseAssignmentExpression();
    } else if (match("=")) {
        lex();
        init = parseAssignmentExpression();
    }

    return markerApply(marker, astNodeFactory.createVariableDeclarator(id, init));
}

function parseVariableDeclarationList(kind) {
    var list = [];

    do {
        list.push(parseVariableDeclaration(kind));
        if (!match(",")) {
            break;
        }
        lex();
    } while (index < length);

    return list;
}

function parseVariableStatement() {
    var declarations;

    expectKeyword("var");

    declarations = parseVariableDeclarationList();

    consumeSemicolon();

    return astNodeFactory.createVariableDeclaration(declarations, "var");
}

// kind may be `const` or `let`
// Both are experimental and not in the specification yet.
// see http://wiki.ecmascript.org/doku.php?id=harmony:const
// and http://wiki.ecmascript.org/doku.php?id=harmony:let
function parseConstLetDeclaration(kind) {
    var declarations,
        marker = markerCreate();

    expectKeyword(kind);

    declarations = parseVariableDeclarationList(kind);

    consumeSemicolon();

    return markerApply(marker, astNodeFactory.createVariableDeclaration(declarations, kind));
}

// 12.3 Empty Statement

function parseEmptyStatement() {
    expect(";");
    return astNodeFactory.createEmptyStatement();
}

// 12.4 Expression Statement

function parseExpressionStatement() {
    var expr = parseExpression();
    consumeSemicolon();
    return astNodeFactory.createExpressionStatement(expr);
}

// 12.5 If statement

function parseIfStatement() {
    var test, consequent, alternate;

    expectKeyword("if");

    expect("(");

    test = parseExpression();

    expect(")");

    consequent = parseStatement();

    if (matchKeyword("else")) {
        lex();
        alternate = parseStatement();
    } else {
        alternate = null;
    }

    return astNodeFactory.createIfStatement(test, consequent, alternate);
}

// 12.6 Iteration Statements

function parseDoWhileStatement() {
    var body, test, oldInIteration;

    expectKeyword("do");

    oldInIteration = state.inIteration;
    state.inIteration = true;

    body = parseStatement();

    state.inIteration = oldInIteration;

    expectKeyword("while");

    expect("(");

    test = parseExpression();

    expect(")");

    if (match(";")) {
        lex();
    }

    return astNodeFactory.createDoWhileStatement(test, body);
}

function parseWhileStatement() {
    var test, body, oldInIteration;

    expectKeyword("while");

    expect("(");

    test = parseExpression();

    expect(")");

    oldInIteration = state.inIteration;
    state.inIteration = true;

    body = parseStatement();

    state.inIteration = oldInIteration;

    return astNodeFactory.createWhileStatement(test, body);
}

function parseForVariableDeclaration() {
    var token, declarations,
        marker = markerCreate();

    token = lex();
    declarations = parseVariableDeclarationList();

    return markerApply(marker, astNodeFactory.createVariableDeclaration(declarations, token.value));
}

function parseForStatement(opts) {
    var init, test, update, left, right, body, operator, oldInIteration;
    var allowForOf = extra.ecmaFeatures.forOf,
        allowBlockBindings = extra.ecmaFeatures.blockBindings;

    init = test = update = null;

    expectKeyword("for");

    expect("(");

    if (match(";")) {
        lex();
    } else {

        if (matchKeyword("var") ||
            (allowBlockBindings && (matchKeyword("let") || matchKeyword("const")))
        ) {
            state.allowIn = false;
            init = parseForVariableDeclaration();
            state.allowIn = true;

            if (init.declarations.length === 1) {
                if (matchKeyword("in") || (allowForOf && matchContextualKeyword("of"))) {
                    operator = lookahead;

                    // TODO: is "var" check here really needed? wasn"t in 1.2.2
                    if (!((operator.value === "in" || init.kind !== "var") && init.declarations[0].init)) {
                        lex();
                        left = init;
                        right = parseExpression();
                        init = null;
                    }
                }
            }

        } else {
            state.allowIn = false;
            init = parseExpression();
            state.allowIn = true;

            if (allowForOf && matchContextualKeyword("of")) {
                operator = lex();
                left = init;
                right = parseExpression();
                init = null;
            } else if (matchKeyword("in")) {
                // LeftHandSideExpression
                if (!isLeftHandSide(init)) {
                    throwErrorTolerant({}, Messages.InvalidLHSInForIn);
                }

                operator = lex();
                left = init;
                right = parseExpression();
                init = null;
            }
        }

        if (typeof left === "undefined") {
            expect(";");
        }
    }

    if (typeof left === "undefined") {

        if (!match(";")) {
            test = parseExpression();
        }
        expect(";");

        if (!match(")")) {
            update = parseExpression();
        }
    }

    expect(")");

    oldInIteration = state.inIteration;
    state.inIteration = true;

    if (!(opts !== undefined && opts.ignoreBody)) {
        body = parseStatement();
    }

    state.inIteration = oldInIteration;

    if (typeof left === "undefined") {
        return astNodeFactory.createForStatement(init, test, update, body);
    }

    if (extra.ecmaFeatures.forOf && operator.value === "of") {
        return astNodeFactory.createForOfStatement(left, right, body);
    }

    return astNodeFactory.createForInStatement(left, right, body);
}

// 12.7 The continue statement

function parseContinueStatement() {
    var label = null;

    expectKeyword("continue");

    // Optimize the most common form: "continue;".
    if (source.charCodeAt(index) === 0x3B) {
        lex();

        if (!state.inIteration) {
            throwError({}, Messages.IllegalContinue);
        }

        return astNodeFactory.createContinueStatement(null);
    }

    if (peekLineTerminator()) {
        if (!state.inIteration) {
            throwError({}, Messages.IllegalContinue);
        }

        return astNodeFactory.createContinueStatement(null);
    }

    if (lookahead.type === Token.Identifier) {
        label = parseVariableIdentifier();

        if (!state.labelSet.has(label.name)) {
            throwError({}, Messages.UnknownLabel, label.name);
        }
    }

    consumeSemicolon();

    if (label === null && !state.inIteration) {
        throwError({}, Messages.IllegalContinue);
    }

    return astNodeFactory.createContinueStatement(label);
}

// 12.8 The break statement

function parseBreakStatement() {
    var label = null;

    expectKeyword("break");

    // Catch the very common case first: immediately a semicolon (U+003B).
    if (source.charCodeAt(index) === 0x3B) {
        lex();

        if (!(state.inIteration || state.inSwitch)) {
            throwError({}, Messages.IllegalBreak);
        }

        return astNodeFactory.createBreakStatement(null);
    }

    if (peekLineTerminator()) {
        if (!(state.inIteration || state.inSwitch)) {
            throwError({}, Messages.IllegalBreak);
        }

        return astNodeFactory.createBreakStatement(null);
    }

    if (lookahead.type === Token.Identifier) {
        label = parseVariableIdentifier();

        if (!state.labelSet.has(label.name)) {
            throwError({}, Messages.UnknownLabel, label.name);
        }
    }

    consumeSemicolon();

    if (label === null && !(state.inIteration || state.inSwitch)) {
        throwError({}, Messages.IllegalBreak);
    }

    return astNodeFactory.createBreakStatement(label);
}

// 12.9 The return statement

function parseReturnStatement() {
    var argument = null;

    expectKeyword("return");

    if (!state.inFunctionBody && !extra.ecmaFeatures.globalReturn) {
        throwErrorTolerant({}, Messages.IllegalReturn);
    }

    // "return" followed by a space and an identifier is very common.
    if (source.charCodeAt(index) === 0x20) {
        if (syntax.isIdentifierStart(source.charCodeAt(index + 1))) {
            argument = parseExpression();
            consumeSemicolon();
            return astNodeFactory.createReturnStatement(argument);
        }
    }

    if (peekLineTerminator()) {
        return astNodeFactory.createReturnStatement(null);
    }

    if (!match(";")) {
        if (!match("}") && lookahead.type !== Token.EOF) {
            argument = parseExpression();
        }
    }

    consumeSemicolon();

    return astNodeFactory.createReturnStatement(argument);
}

// 12.10 The with statement

function parseWithStatement() {
    var object, body;

    if (strict) {
        // TODO(ikarienator): Should we update the test cases instead?
        skipComment();
        throwErrorTolerant({}, Messages.StrictModeWith);
    }

    expectKeyword("with");

    expect("(");

    object = parseExpression();

    expect(")");

    body = parseStatement();

    return astNodeFactory.createWithStatement(object, body);
}

// 12.10 The swith statement

function parseSwitchCase() {
    var test, consequent = [], statement,
        marker = markerCreate();

    if (matchKeyword("default")) {
        lex();
        test = null;
    } else {
        expectKeyword("case");
        test = parseExpression();
    }
    expect(":");

    while (index < length) {
        if (match("}") || matchKeyword("default") || matchKeyword("case")) {
            break;
        }
        statement = parseSourceElement();
        consequent.push(statement);
    }

    return markerApply(marker, astNodeFactory.createSwitchCase(test, consequent));
}

function parseSwitchStatement() {
    var discriminant, cases, clause, oldInSwitch, defaultFound;

    expectKeyword("switch");

    expect("(");

    discriminant = parseExpression();

    expect(")");

    expect("{");

    cases = [];

    if (match("}")) {
        lex();
        return astNodeFactory.createSwitchStatement(discriminant, cases);
    }

    oldInSwitch = state.inSwitch;
    state.inSwitch = true;
    defaultFound = false;

    while (index < length) {
        if (match("}")) {
            break;
        }
        clause = parseSwitchCase();
        if (clause.test === null) {
            if (defaultFound) {
                throwError({}, Messages.MultipleDefaultsInSwitch);
            }
            defaultFound = true;
        }
        cases.push(clause);
    }

    state.inSwitch = oldInSwitch;

    expect("}");

    return astNodeFactory.createSwitchStatement(discriminant, cases);
}

// 12.13 The throw statement

function parseThrowStatement() {
    var argument;

    expectKeyword("throw");

    if (peekLineTerminator()) {
        throwError({}, Messages.NewlineAfterThrow);
    }

    argument = parseExpression();

    consumeSemicolon();

    return astNodeFactory.createThrowStatement(argument);
}

// 12.14 The try statement

function parseCatchClause() {
    var param, body,
        marker = markerCreate();

    expectKeyword("catch");

    expect("(");
    if (match(")")) {
        throwUnexpected(lookahead);
    }

    param = parseVariableIdentifier();
    // 12.14.1
    if (strict && syntax.isRestrictedWord(param.name)) {
        throwErrorTolerant({}, Messages.StrictCatchVariable);
    }

    expect(")");
    body = parseBlock();
    return markerApply(marker, astNodeFactory.createCatchClause(param, body));
}

function parseTryStatement() {
    var block, handlers = [], finalizer = null;

    expectKeyword("try");

    block = parseBlock();

    if (matchKeyword("catch")) {
        handlers.push(parseCatchClause());
    }

    if (matchKeyword("finally")) {
        lex();
        finalizer = parseBlock();
    }

    if (handlers.length === 0 && !finalizer) {
        throwError({}, Messages.NoCatchOrFinally);
    }

    return astNodeFactory.createTryStatement(block, [], handlers, finalizer);
}

// 12.15 The debugger statement

function parseDebuggerStatement() {
    expectKeyword("debugger");

    consumeSemicolon();

    return astNodeFactory.createDebuggerStatement();
}

// 12 Statements

function parseStatement() {
    var type = lookahead.type,
        expr,
        labeledBody,
        marker;

    if (type === Token.EOF) {
        throwUnexpected(lookahead);
    }

    if (type === Token.Punctuator && lookahead.value === "{") {
        return parseBlock();
    }

    marker = markerCreate();

    if (type === Token.Punctuator) {
        switch (lookahead.value) {
            case ";":
                return markerApply(marker, parseEmptyStatement());
            case "{":
                return parseBlock();
            case "(":
                return markerApply(marker, parseExpressionStatement());
            default:
                break;
        }
    }

    marker = markerCreate();

    if (type === Token.Keyword) {
        switch (lookahead.value) {
            case "break":
                return markerApply(marker, parseBreakStatement());
            case "continue":
                return markerApply(marker, parseContinueStatement());
            case "debugger":
                return markerApply(marker, parseDebuggerStatement());
            case "do":
                return markerApply(marker, parseDoWhileStatement());
            case "for":
                return markerApply(marker, parseForStatement());
            case "function":
                return markerApply(marker, parseFunctionDeclaration());
            case "if":
                return markerApply(marker, parseIfStatement());
            case "return":
                return markerApply(marker, parseReturnStatement());
            case "switch":
                return markerApply(marker, parseSwitchStatement());
            case "throw":
                return markerApply(marker, parseThrowStatement());
            case "try":
                return markerApply(marker, parseTryStatement());
            case "var":
                return markerApply(marker, parseVariableStatement());
            case "while":
                return markerApply(marker, parseWhileStatement());
            case "with":
                return markerApply(marker, parseWithStatement());
            default:
                break;
        }
    }

    marker = markerCreate();
    expr = parseExpression();

    // 12.12 Labelled Statements
    if ((expr.type === astNodeTypes.Identifier) && match(":")) {
        lex();

        if (state.labelSet.has(expr.name)) {
            throwError({}, Messages.Redeclaration, "Label", expr.name);
        }

        state.labelSet.set(expr.name, true);
        labeledBody = parseStatement();
        state.labelSet.delete(expr.name);
        return markerApply(marker, astNodeFactory.createLabeledStatement(expr, labeledBody));
    }

    consumeSemicolon();

    return markerApply(marker, astNodeFactory.createExpressionStatement(expr));
}

// 13 Function Definition

// function parseConciseBody() {
//     if (match("{")) {
//         return parseFunctionSourceElements();
//     }
//     return parseAssignmentExpression();
// }

function parseFunctionSourceElements() {
    var sourceElement, sourceElements = [], token, directive, firstRestricted,
        oldLabelSet, oldInIteration, oldInSwitch, oldInFunctionBody, oldParenthesisCount,
        marker = markerCreate();

    expect("{");

    while (index < length) {
        if (lookahead.type !== Token.StringLiteral) {
            break;
        }
        token = lookahead;

        sourceElement = parseSourceElement();
        sourceElements.push(sourceElement);
        if (sourceElement.expression.type !== astNodeTypes.Literal) {
            // this is not directive
            break;
        }
        directive = source.slice(token.range[0] + 1, token.range[1] - 1);
        if (directive === "use strict") {
            strict = true;
            if (firstRestricted) {
                throwErrorTolerant(firstRestricted, Messages.StrictOctalLiteral);
            }
        } else {
            if (!firstRestricted && token.octal) {
                firstRestricted = token;
            }
        }
    }

    oldLabelSet = state.labelSet;
    oldInIteration = state.inIteration;
    oldInSwitch = state.inSwitch;
    oldInFunctionBody = state.inFunctionBody;
    oldParenthesisCount = state.parenthesizedCount;

    state.labelSet = new StringMap();
    state.inIteration = false;
    state.inSwitch = false;
    state.inFunctionBody = true;

    while (index < length) {

        if (match("}")) {
            break;
        }

        sourceElement = parseSourceElement();

        if (typeof sourceElement === "undefined") {
            break;
        }

        sourceElements.push(sourceElement);
    }

    expect("}");

    state.labelSet = oldLabelSet;
    state.inIteration = oldInIteration;
    state.inSwitch = oldInSwitch;
    state.inFunctionBody = oldInFunctionBody;
    state.parenthesizedCount = oldParenthesisCount;

    return markerApply(marker, astNodeFactory.createBlockStatement(sourceElements));
}

function validateParam(options, param, name) {
    if (strict) {
        if (syntax.isRestrictedWord(name)) {
            options.stricted = param;
            options.message = Messages.StrictParamName;
        }
        if (options.paramSet.has(name)) {
            options.stricted = param;
            options.message = Messages.StrictParamDupe;
        }
    } else if (!options.firstRestricted) {
        if (syntax.isRestrictedWord(name)) {
            options.firstRestricted = param;
            options.message = Messages.StrictParamName;
        } else if (syntax.isStrictModeReservedWord(name)) {
            options.firstRestricted = param;
            options.message = Messages.StrictReservedWord;
        } else if (options.paramSet.has(name)) {
            options.firstRestricted = param;
            options.message = Messages.StrictParamDupe;
        }
    }
    options.paramSet.set(name, true);
}

function parseParam(options) {
    var token, rest, param, def,
        allowRestParams = extra.ecmaFeatures.restParams,
        allowDestructuring = extra.ecmaFeatures.destructuring,
        allowDefaultParams = extra.ecmaFeatures.defaultParams;

    token = lookahead;
    if (token.value === "...") {
        if (!allowRestParams) {
            throwUnexpected(lookahead);
        }
        token = lex();
        rest = true;
    }

    if (match("[")) {
        if (!allowDestructuring) {
            throwUnexpected(lookahead);
        }
        param = parseArrayInitialiser();
        reinterpretAsDestructuredParameter(options, param);
    } else if (match("{")) {
        if (rest) {
            throwError({}, Messages.ObjectPatternAsRestParameter);
        }
        if (!allowDestructuring) {
            throwUnexpected(lookahead);
        }
        param = parseObjectInitialiser();
        reinterpretAsDestructuredParameter(options, param);
    } else {
        param = parseVariableIdentifier();
        validateParam(options, token, token.value);
    }

    if (match("=")) {
        if (rest) {
            throwErrorTolerant(lookahead, Messages.DefaultRestParameter);
        }
        if (!allowDefaultParams) {
            throwUnexpected(lookahead);
        }
        lex();
        def = parseAssignmentExpression();
        ++options.defaultCount;
    }

    if (rest) {
        if (!match(")")) {
            throwError({}, Messages.ParameterAfterRestParameter);
        }
        options.rest = param;
        return false;
    }

    options.params.push(param);
    options.defaults.push(def ? def : null); // TODO: determine if null or undefined (see: #55)

    return !match(")");
}


function parseParams(firstRestricted) {
    var options, marker = markerCreate();

    options = {
        params: [],
        defaultCount: 0,
        defaults: [],
        rest: null,
        firstRestricted: firstRestricted
    };

    expect("(");

    if (!match(")")) {
        options.paramSet = new StringMap();
        while (index < length) {
            if (!parseParam(options)) {
                break;
            }
            expect(",");
        }
    }

    expect(")");

    if (options.defaultCount === 0) {
        options.defaults = [];
    }

    return markerApply(marker, options);
}

function parseFunctionDeclaration() {
        var id, body, token, tmp, firstRestricted, message, previousStrict, previousYieldAllowed, generator,
            marker = markerCreate(),
            allowGenerators = extra.ecmaFeatures.generators;

        expectKeyword("function");

        generator = false;
        if (allowGenerators && match("*")) {
            lex();
            generator = true;
        }

        token = lookahead;

        id = parseVariableIdentifier();

        if (strict) {
            if (syntax.isRestrictedWord(token.value)) {
                throwErrorTolerant(token, Messages.StrictFunctionName);
            }
        } else {
            if (syntax.isRestrictedWord(token.value)) {
                firstRestricted = token;
                message = Messages.StrictFunctionName;
            } else if (syntax.isStrictModeReservedWord(token.value)) {
                firstRestricted = token;
                message = Messages.StrictReservedWord;
            }
        }

        tmp = parseParams(firstRestricted);
        firstRestricted = tmp.firstRestricted;
        if (tmp.message) {
            message = tmp.message;
        }

        previousStrict = strict;
        previousYieldAllowed = state.yieldAllowed;
        state.yieldAllowed = generator;

        body = parseFunctionSourceElements();

        if (strict && firstRestricted) {
            throwError(firstRestricted, message);
        }
        if (strict && tmp.stricted) {
            throwErrorTolerant(tmp.stricted, message);
        }
        strict = previousStrict;
        state.yieldAllowed = previousYieldAllowed;

        return markerApply(
            marker,
            astNodeFactory.createFunctionDeclaration(
                id,
                tmp.params,
                tmp.defaults,
                body,
                tmp.rest,
                generator,
                false
            )
        );
    }

function parseFunctionExpression() {
    var token, id = null, firstRestricted, message, tmp, body, previousStrict, previousYieldAllowed, generator,
        marker = markerCreate(),
        allowGenerators = extra.ecmaFeatures.generators;

    expectKeyword("function");

    generator = false;

    if (allowGenerators && match("*")) {
        lex();
        generator = true;
    }

    if (!match("(")) {
        token = lookahead;
        id = parseVariableIdentifier();
        if (strict) {
            if (syntax.isRestrictedWord(token.value)) {
                throwErrorTolerant(token, Messages.StrictFunctionName);
            }
        } else {
            if (syntax.isRestrictedWord(token.value)) {
                firstRestricted = token;
                message = Messages.StrictFunctionName;
            } else if (syntax.isStrictModeReservedWord(token.value)) {
                firstRestricted = token;
                message = Messages.StrictReservedWord;
            }
        }
    }

    tmp = parseParams(firstRestricted);
    firstRestricted = tmp.firstRestricted;
    if (tmp.message) {
        message = tmp.message;
    }

    previousStrict = strict;
    previousYieldAllowed = state.yieldAllowed;
    state.yieldAllowed = generator;

    body = parseFunctionSourceElements();

    if (strict && firstRestricted) {
        throwError(firstRestricted, message);
    }
    if (strict && tmp.stricted) {
        throwErrorTolerant(tmp.stricted, message);
    }
    strict = previousStrict;
    state.yieldAllowed = previousYieldAllowed;

    return markerApply(
        marker,
        astNodeFactory.createFunctionExpression(
            id,
            tmp.params,
            tmp.defaults,
            body,
            tmp.rest,
            generator,
            false
        )
    );
}

function parseYieldExpression() {
    var yieldToken, delegateFlag, expr, marker = markerCreate();

    yieldToken = lex();
    assert(yieldToken.value === "yield", "Called parseYieldExpression with non-yield lookahead.");

    if (!state.yieldAllowed) {
        throwErrorTolerant({}, Messages.IllegalYield);
    }

    delegateFlag = false;
    if (match("*")) {
        lex();
        delegateFlag = true;
    }

    expr = parseAssignmentExpression();

    return markerApply(marker, astNodeFactory.createYieldExpression(expr, delegateFlag));
}


// 14 Program

function parseSourceElement() {
    if (lookahead.type === Token.Keyword) {
        switch (lookahead.value) {
            case "function":
                return parseFunctionDeclaration();
            case "const":
            case "let":
                if (extra.ecmaFeatures.blockBindings) {
                    return parseConstLetDeclaration(lookahead.value);
                }
                /* falls through */
            default:
                return parseStatement();
        }
    }

    if (lookahead.type !== Token.EOF) {
        return parseStatement();
    }
}

function parseSourceElements() {
    var sourceElement, sourceElements = [], token, directive, firstRestricted;

    while (index < length) {
        token = lookahead;
        if (token.type !== Token.StringLiteral) {
            break;
        }

        sourceElement = parseSourceElement();
        sourceElements.push(sourceElement);
        if (sourceElement.expression.type !== astNodeTypes.Literal) {
            // this is not directive
            break;
        }
        directive = source.slice(token.range[0] + 1, token.range[1] - 1);
        if (directive === "use strict") {
            strict = true;
            if (firstRestricted) {
                throwErrorTolerant(firstRestricted, Messages.StrictOctalLiteral);
            }
        } else {
            if (!firstRestricted && token.octal) {
                firstRestricted = token;
            }
        }
    }

    while (index < length) {
        sourceElement = parseSourceElement();
        /* istanbul ignore if */
        if (typeof sourceElement === "undefined") {
            break;
        }
        sourceElements.push(sourceElement);
    }
    return sourceElements;
}

function parseProgram() {
    var body,
        marker;

    skipComment();
    peek();
    marker = markerCreate();
    strict = false;

    body = parseSourceElements();
    return markerApply(marker, astNodeFactory.createProgram(body));
}

function filterTokenLocation() {
    var i, entry, token, tokens = [];

    for (i = 0; i < extra.tokens.length; ++i) {
        entry = extra.tokens[i];
        token = {
            type: entry.type,
            value: entry.value
        };
        if (entry.regex) {
            token.regex = {
                pattern: entry.regex.pattern,
                flags: entry.regex.flags
            };
        }
        if (extra.range) {
            token.range = entry.range;
        }
        if (extra.loc) {
            token.loc = entry.loc;
        }
        tokens.push(token);
    }

    extra.tokens = tokens;
}

//------------------------------------------------------------------------------
// Tokenizer
//------------------------------------------------------------------------------

function tokenize(code, options) {
    var toString,
        tokens;

    toString = String;
    if (typeof code !== "string" && !(code instanceof String)) {
        code = toString(code);
    }

    source = code;
    index = 0;
    lineNumber = (source.length > 0) ? 1 : 0;
    lineStart = 0;
    length = source.length;
    lookahead = null;
    state = {
        allowIn: true,
        labelSet: {},
        parenthesisCount: 0,
        inFunctionBody: false,
        inIteration: false,
        inSwitch: false,
        lastCommentStart: -1,
        yieldAllowed: false,
        inJSXSpreadAttribute: false,
        inJSXChild: false,
        inJSXTag: false
    };

    extra = {
        ecmaFeatures: defaultFeatures
    };

    // Options matching.
    options = options || {};

    // Of course we collect tokens here.
    options.tokens = true;
    extra.tokens = [];
    extra.tokenize = true;

    // The following two fields are necessary to compute the Regex tokens.
    extra.openParenToken = -1;
    extra.openCurlyToken = -1;

    // Needed when using template string tokenization
    extra.curlies = [];

    extra.range = (typeof options.range === "boolean") && options.range;
    extra.loc = (typeof options.loc === "boolean") && options.loc;

    if (typeof options.comment === "boolean" && options.comment) {
        extra.comments = [];
    }
    if (typeof options.tolerant === "boolean" && options.tolerant) {
        extra.errors = [];
    }

    // apply parsing flags
    if (options.ecmaFeatures && typeof options.ecmaFeatures === "object") {
        extra.ecmaFeatures = options.ecmaFeatures;
    }

    try {
        peek();
        if (lookahead.type === Token.EOF) {
            return extra.tokens;
        }

        lex();
        while (lookahead.type !== Token.EOF) {
            try {
                lex();
            } catch (lexError) {
                if (extra.errors) {
                    extra.errors.push(lexError);
                    // We have to break on the first error
                    // to avoid infinite loops.
                    break;
                } else {
                    throw lexError;
                }
            }
        }

        filterTokenLocation();
        tokens = extra.tokens;

        if (typeof extra.comments !== "undefined") {
            tokens.comments = extra.comments;
        }
        if (typeof extra.errors !== "undefined") {
            tokens.errors = extra.errors;
        }
    } catch (e) {
        throw e;
    } finally {
        extra = {};
    }
    return tokens;
}

//------------------------------------------------------------------------------
// Parser
//------------------------------------------------------------------------------

function parse(code, options) {
    var program, toString;

    toString = String;
    if (typeof code !== "string" && !(code instanceof String)) {
        code = toString(code);
    }

    source = code;
    index = 0;
    lineNumber = (source.length > 0) ? 1 : 0;
    lineStart = 0;
    length = source.length;
    lookahead = null;
    state = {
        allowIn: true,
        labelSet: new StringMap(),
        parenthesisCount: 0,
        inFunctionBody: false,
        inIteration: false,
        inSwitch: false,
        lastCommentStart: -1,
        yieldAllowed: false,
        inJSXSpreadAttribute: false,
        inJSXChild: false,
        inJSXTag: false
    };

    extra = {
        ecmaFeatures: defaultFeatures
    };

    // for template strings
    extra.curlies = [];

    if (typeof options !== "undefined") {
        extra.range = (typeof options.range === "boolean") && options.range;
        extra.loc = (typeof options.loc === "boolean") && options.loc;
        extra.attachComment = (typeof options.attachComment === "boolean") && options.attachComment;

        // apply parsing flags
        if (options.ecmaFeatures && typeof options.ecmaFeatures === "object") {
            extra.ecmaFeatures = options.ecmaFeatures;
        }

        if (extra.loc && options.source !== null && options.source !== undefined) {
            extra.source = toString(options.source);
        }

        if (typeof options.tokens === "boolean" && options.tokens) {
            extra.tokens = [];
        }
        if (typeof options.comment === "boolean" && options.comment) {
            extra.comments = [];
        }
        if (typeof options.tolerant === "boolean" && options.tolerant) {
            extra.errors = [];
        }
        if (extra.attachComment) {
            extra.range = true;
            extra.comments = [];
            extra.bottomRightStack = [];
            extra.trailingComments = [];
            extra.leadingComments = [];
        }
    }

    try {
        program = parseProgram();
        if (typeof extra.comments !== "undefined") {
            program.comments = extra.comments;
        }
        if (typeof extra.tokens !== "undefined") {
            filterTokenLocation();
            program.tokens = extra.tokens;
        }
        if (typeof extra.errors !== "undefined") {
            program.errors = extra.errors;
        }
    } catch (e) {
        throw e;
    } finally {
        extra = {};
    }

    return program;
}

//------------------------------------------------------------------------------
// Public
//------------------------------------------------------------------------------

exports.version = require("./package.json").version;

exports.tokenize = tokenize;

exports.parse = parse;

// Deep copy.
/* istanbul ignore next */
exports.Syntax = (function () {
    var name, types = {};

    if (typeof Object.create === "function") {
        types = Object.create(null);
    }

    for (name in astNodeTypes) {
        if (astNodeTypes.hasOwnProperty(name)) {
            types[name] = astNodeTypes[name];
        }
    }

    if (typeof Object.freeze === "function") {
        Object.freeze(types);
    }

    return types;
}());
