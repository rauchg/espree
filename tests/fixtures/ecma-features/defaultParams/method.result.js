module.exports = {
	"type": "Program",
	"body": [
		{
			"type": "ExpressionStatement",
			"expression": {
				"type": "AssignmentExpression",
				"operator": "=",
				"left": {
					"type": "Identifier",
					"name": "x",
					"range": [0, 1],
					"loc": {
						"start": { "line": 1, "column": 0},
						"end": { "line": 1, "column": 1}
					}
				},
				"right": {
					"type": "ObjectExpression",
					"properties": [{
						"type": "Property",
						"computed": false,
						"key": {
							"type": "Identifier",
							"name": "f",
							"range": [6, 7],
							"loc": {
								"start": { "line": 1, "column": 6},
								"end": { "line": 1, "column": 7}
							}
						},
						"value": {
							"type": "FunctionExpression",
							"id": null,
							"params": [{
								"type": "Identifier",
								"name": "a",
								"range": [18, 19],
								"loc": {
									"start": { "line": 1, "column": 18},
									"end": { "line": 1, "column": 19}
								}
							}],
							"defaults": [{
								"type": "Literal",
								"value": 1,
								"raw": "1",
								"range": [20, 21],
								"loc": {
									"start": { "line": 1, "column": 20},
									"end": { "line": 1, "column": 21}
								}
							}],
							"body": {
								"type": "BlockStatement",
								"body": [],
								"range": [23, 25],
								"loc": {
									"start": { "line": 1, "column": 23},
									"end": { "line": 1, "column": 25}
								}
							},
							"rest": null,
							"generator": false,
							"expression": false,
							"range": [9, 25],
							"loc": {
								"start": { "line": 1, "column": 9},
								"end": { "line": 1, "column": 25}
							}
						},
						"kind": "init",
						"method": false,
						"shorthand": false,
						"range": [6, 25],
						"loc": {
							"start": { "line": 1, "column": 6},
							"end": { "line": 1, "column": 25}
						}
					}],
					"range": [4, 27],
					"loc": {
						"start": { "line": 1, "column": 4},
						"end": { "line": 1, "column": 27}
					}
				},
				"range": [0, 27],
				"loc": {
					"start": { "line": 1, "column": 0},
					"end": { "line": 1, "column": 27}
				}
			},
			"range": [0, 27],
			"loc": {
				"start": { "line": 1, "column": 0},
				"end": { "line": 1, "column": 27}
			}
		}
	],
	"loc": {
		"end": {
	  		"column": 27,
		  	"line": 1
		},
		"start": {
	  		"column": 0,
	  		"line": 1
		}
	},
	"range": [
		0,
		27
	]
};