module.exports = {
    "type": "Program",
    "body": [
        {
            "type": "ForOfStatement",
            "left": {
                "type": "VariableDeclaration",
                "declarations": [
                    {
                        "type": "VariableDeclarator",
                        "id": {
                            "type": "Identifier",
                            "name": "x",
                            "range": [
                                9,
                                10
                            ],
                            "loc": {
                                "start": {
                                    "line": 1,
                                    "column": 9
                                },
                                "end": {
                                    "line": 1,
                                    "column": 10
                                }
                            }
                        },
                        "init": null,
                        "range": [
                            9,
                            10
                        ],
                        "loc": {
                            "start": {
                                "line": 1,
                                "column": 9
                            },
                            "end": {
                                "line": 1,
                                "column": 10
                            }
                        }
                    }
                ],
                "kind": "var",
                "range": [
                    5,
                    10
                ],
                "loc": {
                    "start": {
                        "line": 1,
                        "column": 5
                    },
                    "end": {
                        "line": 1,
                        "column": 10
                    }
                }
            },
            "right": {
                "type": "Identifier",
                "name": "foo",
                "range": [
                    14,
                    17
                ],
                "loc": {
                    "start": {
                        "line": 1,
                        "column": 14
                    },
                    "end": {
                        "line": 1,
                        "column": 17
                    }
                }
            },
            "body": {
                "type": "BlockStatement",
                "body": [
                    {
                        "type": "ExpressionStatement",
                        "expression": {
                            "type": "CallExpression",
                            "callee": {
                                "type": "Identifier",
                                "name": "doSomething",
                                "range": [
                                    25,
                                    36
                                ],
                                "loc": {
                                    "start": {
                                        "line": 2,
                                        "column": 4
                                    },
                                    "end": {
                                        "line": 2,
                                        "column": 15
                                    }
                                }
                            },
                            "arguments": [],
                            "range": [
                                25,
                                38
                            ],
                            "loc": {
                                "start": {
                                    "line": 2,
                                    "column": 4
                                },
                                "end": {
                                    "line": 2,
                                    "column": 17
                                }
                            }
                        },
                        "range": [
                            25,
                            39
                        ],
                        "loc": {
                            "start": {
                                "line": 2,
                                "column": 4
                            },
                            "end": {
                                "line": 2,
                                "column": 18
                            }
                        }
                    }
                ],
                "range": [
                    19,
                    41
                ],
                "loc": {
                    "start": {
                        "line": 1,
                        "column": 19
                    },
                    "end": {
                        "line": 3,
                        "column": 1
                    }
                }
            },
            "range": [
                0,
                41
            ],
            "loc": {
                "start": {
                    "line": 1,
                    "column": 0
                },
                "end": {
                    "line": 3,
                    "column": 1
                }
            }
        }
    ],
    "range": [
        0,
        41
    ],
    "loc": {
        "start": {
            "line": 1,
            "column": 0
        },
        "end": {
            "line": 3,
            "column": 1
        }
    }
};