module.exports = {
	"type": "Program",
	"loc": {
		"end": {
		  "column": 22,
		  "line": 1
		},
		"start": {
		  "column": 0,
		  "line": 1
		}
	},
	"range": [
		0,
		22
	],
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
						"start": { "line": 1, "column": 0 },
						"end": { "line": 1, "column": 1 }
					}
				},
				"right": {
					"type": "FunctionExpression",
						"id": null,
						"params": [{
						"type": "Identifier",
						"name": "y",
						"range": [13, 14],
						"loc": {
							"start": { "line": 1, "column": 13 },
							"end": { "line": 1, "column": 14 }
						}
					}],
						"defaults": [{
						"type": "Literal",
						"value": 1,
						"raw": "1",
						"range": [17, 18],
						"loc": {
							"start": { "line": 1, "column": 17 },
							"end": { "line": 1, "column": 18 }
						}
					}],
						"body": {
						"type": "BlockStatement",
							"body": [],
							"range": [20, 22],
							"loc": {
							"start": { "line": 1, "column": 20 },
							"end": { "line": 1, "column": 22 }
						}
					},
					"rest": null,
						"generator": false,
						"expression": false,
						"range": [4, 22],
						"loc": {
						"start": { "line": 1, "column": 4 },
						"end": { "line": 1, "column": 22 }
					}
				},
				"range": [0, 22],
					"loc": {
					"start": { "line": 1, "column": 0 },
					"end": { "line": 1, "column": 22 }
				}
			},
			"range": [0, 22],
			"loc": {
				"start": { "line": 1, "column": 0},
				"end": { "line": 1, "column": 22}
			}
		}
	]
};