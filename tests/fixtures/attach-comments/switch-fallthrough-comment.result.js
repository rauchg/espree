module.exports = {
    "type": "Program",
    "body": [
        {
            "type": "SwitchStatement",
            "discriminant": {
                "type": "Identifier",
                "name": "foo",
                "range": [
                    7,
                    10
                ],
                "loc": {
                    "start": {
                        "line": 1,
                        "column": 7
                    },
                    "end": {
                        "line": 1,
                        "column": 10
                    }
                }
            },
            "cases": [
                {
                    "type": "SwitchCase",
                    "test": {
                        "type": "Literal",
                        "value": 1,
                        "raw": "1",
                        "range": [
                            34,
                            35
                        ],
                        "loc": {
                            "start": {
                                "line": 3,
                                "column": 9
                            },
                            "end": {
                                "line": 3,
                                "column": 10
                            }
                        }
                    },
                    "consequent": [],
                    "range": [
                        29,
                        36
                    ],
                    "loc": {
                        "start": {
                            "line": 3,
                            "column": 4
                        },
                        "end": {
                            "line": 3,
                            "column": 11
                        }
                    },
                    "leadingComments": [
                        {
                            "type": "Line",
                            "value": " foo",
                            "range": [
                                18,
                                24
                            ],
                            "loc": {
                                "start": {
                                    "line": 2,
                                    "column": 4
                                },
                                "end": {
                                    "line": 2,
                                    "column": 10
                                }
                            }
                        }
                    ],
                    "trailingComments": [
                        {
                            "type": "Line",
                            "value": " falls through",
                            "range": [
                                45,
                                61
                            ],
                            "loc": {
                                "start": {
                                    "line": 4,
                                    "column": 8
                                },
                                "end": {
                                    "line": 4,
                                    "column": 24
                                }
                            }
                        }
                    ]
                },
                {
                    "type": "SwitchCase",
                    "test": {
                        "type": "Literal",
                        "value": 2,
                        "raw": "2",
                        "range": [
                            71,
                            72
                        ],
                        "loc": {
                            "start": {
                                "line": 5,
                                "column": 9
                            },
                            "end": {
                                "line": 5,
                                "column": 10
                            }
                        }
                    },
                    "consequent": [
                        {
                            "type": "ExpressionStatement",
                            "expression": {
                                "type": "CallExpression",
                                "callee": {
                                    "type": "Identifier",
                                    "name": "doIt",
                                    "range": [
                                        82,
                                        86
                                    ],
                                    "loc": {
                                        "start": {
                                            "line": 6,
                                            "column": 8
                                        },
                                        "end": {
                                            "line": 6,
                                            "column": 12
                                        }
                                    }
                                },
                                "arguments": [],
                                "range": [
                                    82,
                                    88
                                ],
                                "loc": {
                                    "start": {
                                        "line": 6,
                                        "column": 8
                                    },
                                    "end": {
                                        "line": 6,
                                        "column": 14
                                    }
                                }
                            },
                            "range": [
                                82,
                                89
                            ],
                            "loc": {
                                "start": {
                                    "line": 6,
                                    "column": 8
                                },
                                "end": {
                                    "line": 6,
                                    "column": 15
                                }
                            }
                        }
                    ],
                    "range": [
                        66,
                        89
                    ],
                    "loc": {
                        "start": {
                            "line": 5,
                            "column": 4
                        },
                        "end": {
                            "line": 6,
                            "column": 15
                        }
                    },
                    "leadingComments": [
                        {
                            "type": "Line",
                            "value": " falls through",
                            "range": [
                                45,
                                61
                            ],
                            "loc": {
                                "start": {
                                    "line": 4,
                                    "column": 8
                                },
                                "end": {
                                    "line": 4,
                                    "column": 24
                                }
                            }
                        }
                    ]
                }
            ],
            "range": [
                0,
                91
            ],
            "loc": {
                "start": {
                    "line": 1,
                    "column": 0
                },
                "end": {
                    "line": 7,
                    "column": 1
                }
            }
        }
    ],
    "range": [
        0,
        91
    ],
    "loc": {
        "start": {
            "line": 1,
            "column": 0
        },
        "end": {
            "line": 7,
            "column": 1
        }
    },
    "comments": [
        {
            "type": "Line",
            "value": " foo",
            "range": [
                18,
                24
            ],
            "loc": {
                "start": {
                    "line": 2,
                    "column": 4
                },
                "end": {
                    "line": 2,
                    "column": 10
                }
            }
        },
        {
            "type": "Line",
            "value": " falls through",
            "range": [
                45,
                61
            ],
            "loc": {
                "start": {
                    "line": 4,
                    "column": 8
                },
                "end": {
                    "line": 4,
                    "column": 24
                }
            }
        }
    ]
};