module.exports = {
	"type": "Program",
	"body": [
		{
			"type": "FunctionDeclaration",
			"id": {
				"type": "Identifier",
					"name": "f",
					"range": [9, 10],
					"loc": {
					"start": { "line": 1, "column": 9 },
					"end": { "line": 1, "column": 10 }
				}
			},
				"params": [{
					"type": "Identifier",
					"name": "a",
					"range": [11, 12],
					"loc": {
						"start": { "line": 1, "column": 11 },
						"end": { "line": 1, "column": 12 }
					}
				}],
					"defaults": [{
				"type": "Literal",
				"value": 1,
				"raw": "1",
				"range": [15, 16],
				"loc": {
					"start": { "line": 1, "column": 15 },
					"end": { "line": 1, "column": 16 }
				}
			}],
				"body": {
				"type": "BlockStatement",
					"body": [],
					"range": [18, 20],
					"loc": {
					"start": { "line": 1, "column": 18 },
					"end": { "line": 1, "column": 20 }
				}
			},
			"rest": null,
			"generator": false,
			"expression": false,
			"range": [0, 20],
			"loc": {
				"start": { "line": 1, "column": 0},
				"end": { "line": 1, "column": 20}
			}
		}
	],
  	"loc": {
	    "end": {
		      "column": 20,
		      "line": 1
		},
	    "start": {
		      "column": 0,
		      "line": 1
		    }
	  },
  	"range": [
	    0,
	    20
  	]
};