module.exports = {
    "type": "Program",
    "body": [
        {
            type: 'SwitchStatement',
            discriminant: {
                type: 'Identifier',
                name: 'answer',
                range: [8, 14],
                loc: {
                    start: { line: 1, column: 8 },
                    end: { line: 1, column: 14 }
                }
            },
            cases: [{
                type: 'SwitchCase',
                test: {
                    type: 'Literal',
                    value: 42,
                    raw: '42',
                    range: [23, 25],
                    loc: {
                        start: { line: 1, column: 23 },
                        end: { line: 1, column: 25 }
                    }
                },
                consequent: [{
                    type: 'VariableDeclaration',
                    declarations: [{
                        type: 'VariableDeclarator',
                        id: {
                            type: 'Identifier',
                            name: 't',
                            range: [31, 32],
                            loc: {
                                start: { line: 1, column: 31 },
                                end: { line: 1, column: 32 }
                            }
                        },
                        init: {
                            type: 'Literal',
                            value: 42,
                            raw: '42',
                            range: [35, 37],
                            loc: {
                                start: { line: 1, column: 35 },
                                end: { line: 1, column: 37 }
                            }
                        },
                        range: [31, 37],
                        loc: {
                            start: { line: 1, column: 31 },
                            end: { line: 1, column: 37 }
                        }
                    }],
                    kind: 'let',
                    range: [27, 38],
                    loc: {
                        start: { line: 1, column: 27 },
                        end: { line: 1, column: 38 }
                    }
                }, {
                    type: 'BreakStatement',
                    label: null,
                    range: [39, 45],
                    loc: {
                        start: { line: 1, column: 39 },
                        end: { line: 1, column: 45 }
                    }
                }],
                range: [18, 45],
                loc: {
                    start: { line: 1, column: 18 },
                    end: { line: 1, column: 45 }
                }
            }],
            range: [0, 47],
            loc: {
                start: { line: 1, column: 0 },
                end: { line: 1, column: 47 }
            }
        }
    ],
    "range": [
        0,
        47
    ],
    "loc": {
        "start": {
            "line": 1,
            "column": 0
        },
        "end": {
            "line": 1,
            "column": 47
        }
    }
};
