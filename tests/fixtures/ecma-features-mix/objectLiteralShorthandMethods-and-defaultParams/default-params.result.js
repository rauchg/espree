module.exports = {
    "type": "Program",
    "body": [
        {
            "type": "ExpressionStatement",
            "expression": {
                "type": "Literal",
                "value": "use strict",
                "raw": "\"use strict\"",
                "range": [
                    0,
                    12
                ],
                "loc": {
                    "start": {
                        "line": 1,
                        "column": 0
                    },
                    "end": {
                        "line": 1,
                        "column": 12
                    }
                }
            },
            "range": [
                0,
                13
            ],
            "loc": {
                "start": {
                    "line": 1,
                    "column": 0
                },
                "end": {
                    "line": 1,
                    "column": 13
                }
            }
        },
        {
            "type": "VariableDeclaration",
            "declarations": [
                {
                    "type": "VariableDeclarator",
                    "id": {
                        "type": "Identifier",
                        "name": "x",
                        "range": [
                            19,
                            20
                        ],
                        "loc": {
                            "start": {
                                "line": 3,
                                "column": 4
                            },
                            "end": {
                                "line": 3,
                                "column": 5
                            }
                        }
                    },
                    "init": {
                        "type": "ObjectExpression",
                        "properties": [
                            {
                                "type": "Property",
                                "key": {
                                    "type": "Identifier",
                                    "name": "baz",
                                    "range": [
                                        26,
                                        29
                                    ],
                                    "loc": {
                                        "start": {
                                            "line": 4,
                                            "column": 1
                                        },
                                        "end": {
                                            "line": 4,
                                            "column": 4
                                        }
                                    }
                                },
                                "value": {
                                    "type": "FunctionExpression",
                                    "id": null,
                                    "params": [
                                        {
                                            "type": "Identifier",
                                            "name": "a",
                                            "range": [
                                                30,
                                                31
                                            ],
                                            "loc": {
                                                "start": {
                                                    "line": 4,
                                                    "column": 5
                                                },
                                                "end": {
                                                    "line": 4,
                                                    "column": 6
                                                }
                                            }
                                        }
                                    ],
                                    "defaults": [
                                        {
                                            "type": "Literal",
                                            "value": 10,
                                            "raw": "10",
                                            "range": [
                                                34,
                                                36
                                            ],
                                            "loc": {
                                                "start": {
                                                    "line": 4,
                                                    "column": 9
                                                },
                                                "end": {
                                                    "line": 4,
                                                    "column": 11
                                                }
                                            }
                                        }
                                    ],
                                    "body": {
                                        "type": "BlockStatement",
                                        "body": [],
                                        "range": [
                                            38,
                                            40
                                        ],
                                        "loc": {
                                            "start": {
                                                "line": 4,
                                                "column": 13
                                            },
                                            "end": {
                                                "line": 4,
                                                "column": 15
                                            }
                                        }
                                    },
                                    "rest": null,
                                    "generator": false,
                                    "expression": false,
                                    "range": [
                                        29,
                                        40
                                    ],
                                    "loc": {
                                        "start": {
                                            "line": 4,
                                            "column": 4
                                        },
                                        "end": {
                                            "line": 4,
                                            "column": 15
                                        }
                                    }
                                },
                                "kind": "init",
                                "method": true,
                                "shorthand": false,
                                "computed": false,
                                "range": [
                                    26,
                                    40
                                ],
                                "loc": {
                                    "start": {
                                        "line": 4,
                                        "column": 1
                                    },
                                    "end": {
                                        "line": 4,
                                        "column": 15
                                    }
                                }
                            },
                            {
                                "type": "Property",
                                "key": {
                                    "type": "Identifier",
                                    "name": "foo",
                                    "range": [
                                        43,
                                        46
                                    ],
                                    "loc": {
                                        "start": {
                                            "line": 5,
                                            "column": 1
                                        },
                                        "end": {
                                            "line": 5,
                                            "column": 4
                                        }
                                    }
                                },
                                "value": {
                                    "type": "FunctionExpression",
                                    "id": null,
                                    "params": [
                                        {
                                            "type": "Identifier",
                                            "name": "a",
                                            "range": [
                                                47,
                                                48
                                            ],
                                            "loc": {
                                                "start": {
                                                    "line": 5,
                                                    "column": 5
                                                },
                                                "end": {
                                                    "line": 5,
                                                    "column": 6
                                                }
                                            }
                                        },
                                        {
                                            "type": "Identifier",
                                            "name": "b",
                                            "range": [
                                                50,
                                                51
                                            ],
                                            "loc": {
                                                "start": {
                                                    "line": 5,
                                                    "column": 8
                                                },
                                                "end": {
                                                    "line": 5,
                                                    "column": 9
                                                }
                                            }
                                        }
                                    ],
                                    "defaults": [
                                        null,
                                        {
                                            "type": "Literal",
                                            "value": 10,
                                            "raw": "10",
                                            "range": [
                                                54,
                                                56
                                            ],
                                            "loc": {
                                                "start": {
                                                    "line": 5,
                                                    "column": 12
                                                },
                                                "end": {
                                                    "line": 5,
                                                    "column": 14
                                                }
                                            }
                                        }
                                    ],
                                    "body": {
                                        "type": "BlockStatement",
                                        "body": [],
                                        "range": [
                                            58,
                                            60
                                        ],
                                        "loc": {
                                            "start": {
                                                "line": 5,
                                                "column": 16
                                            },
                                            "end": {
                                                "line": 5,
                                                "column": 18
                                            }
                                        }
                                    },
                                    "rest": null,
                                    "generator": false,
                                    "expression": false,
                                    "range": [
                                        46,
                                        60
                                    ],
                                    "loc": {
                                        "start": {
                                            "line": 5,
                                            "column": 4
                                        },
                                        "end": {
                                            "line": 5,
                                            "column": 18
                                        }
                                    }
                                },
                                "kind": "init",
                                "method": true,
                                "shorthand": false,
                                "computed": false,
                                "range": [
                                    43,
                                    60
                                ],
                                "loc": {
                                    "start": {
                                        "line": 5,
                                        "column": 1
                                    },
                                    "end": {
                                        "line": 5,
                                        "column": 18
                                    }
                                }
                            },
                            {
                                "type": "Property",
                                "key": {
                                    "type": "Identifier",
                                    "name": "toast",
                                    "range": [
                                        63,
                                        68
                                    ],
                                    "loc": {
                                        "start": {
                                            "line": 6,
                                            "column": 1
                                        },
                                        "end": {
                                            "line": 6,
                                            "column": 6
                                        }
                                    }
                                },
                                "value": {
                                    "type": "FunctionExpression",
                                    "id": null,
                                    "params": [
                                        {
                                            "type": "Identifier",
                                            "name": "a",
                                            "range": [
                                                69,
                                                70
                                            ],
                                            "loc": {
                                                "start": {
                                                    "line": 6,
                                                    "column": 7
                                                },
                                                "end": {
                                                    "line": 6,
                                                    "column": 8
                                                }
                                            }
                                        },
                                        {
                                            "type": "Identifier",
                                            "name": "b",
                                            "range": [
                                                72,
                                                73
                                            ],
                                            "loc": {
                                                "start": {
                                                    "line": 6,
                                                    "column": 10
                                                },
                                                "end": {
                                                    "line": 6,
                                                    "column": 11
                                                }
                                            }
                                        },
                                        {
                                            "type": "Identifier",
                                            "name": "c",
                                            "range": [
                                                80,
                                                81
                                            ],
                                            "loc": {
                                                "start": {
                                                    "line": 6,
                                                    "column": 18
                                                },
                                                "end": {
                                                    "line": 6,
                                                    "column": 19
                                                }
                                            }
                                        }
                                    ],
                                    "defaults": [
                                        null,
                                        {
                                            "type": "Literal",
                                            "value": 10,
                                            "raw": "10",
                                            "range": [
                                                76,
                                                78
                                            ],
                                            "loc": {
                                                "start": {
                                                    "line": 6,
                                                    "column": 14
                                                },
                                                "end": {
                                                    "line": 6,
                                                    "column": 16
                                                }
                                            }
                                        },
                                        null
                                    ],
                                    "body": {
                                        "type": "BlockStatement",
                                        "body": [],
                                        "range": [
                                            83,
                                            85
                                        ],
                                        "loc": {
                                            "start": {
                                                "line": 6,
                                                "column": 21
                                            },
                                            "end": {
                                                "line": 6,
                                                "column": 23
                                            }
                                        }
                                    },
                                    "rest": null,
                                    "generator": false,
                                    "expression": false,
                                    "range": [
                                        68,
                                        85
                                    ],
                                    "loc": {
                                        "start": {
                                            "line": 6,
                                            "column": 6
                                        },
                                        "end": {
                                            "line": 6,
                                            "column": 23
                                        }
                                    }
                                },
                                "kind": "init",
                                "method": true,
                                "shorthand": false,
                                "computed": false,
                                "range": [
                                    63,
                                    85
                                ],
                                "loc": {
                                    "start": {
                                        "line": 6,
                                        "column": 1
                                    },
                                    "end": {
                                        "line": 6,
                                        "column": 23
                                    }
                                }
                            }
                        ],
                        "range": [
                            23,
                            87
                        ],
                        "loc": {
                            "start": {
                                "line": 3,
                                "column": 8
                            },
                            "end": {
                                "line": 7,
                                "column": 1
                            }
                        }
                    },
                    "range": [
                        19,
                        87
                    ],
                    "loc": {
                        "start": {
                            "line": 3,
                            "column": 4
                        },
                        "end": {
                            "line": 7,
                            "column": 1
                        }
                    }
                }
            ],
            "kind": "var",
            "range": [
                15,
                88
            ],
            "loc": {
                "start": {
                    "line": 3,
                    "column": 0
                },
                "end": {
                    "line": 7,
                    "column": 2
                }
            }
        }
    ],
    "range": [
        0,
        88
    ],
    "loc": {
        "start": {
            "line": 1,
            "column": 0
        },
        "end": {
            "line": 7,
            "column": 2
        }
    }
}
