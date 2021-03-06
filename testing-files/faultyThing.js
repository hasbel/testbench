var Servient = require('thingweb.node-wot/packages/core').Servient;
var HttpServer = require('thingweb.node-wot/packages/binding-http').HttpServer;
var HttpClientFactory = require('thingweb.node-wot/packages/binding-http').HttpClientFactory;
var XMLHttpRequest = require("xmlhttprequest").XMLHttpRequest;

let srv = new Servient();
srv.addServer(new HttpServer(8081));
srv.addClientFactory(new HttpClientFactory());
srv.start().then(WoT => {

    console.log('* started servient');

    let thing = WoT.produce({
        name: "TestServient",
        description: "Test servient that can be used as a servient to be tested with the WoT Test Bench. All interactions have errors explicetely coded"
    });

    thing.addProperty("display", {
        type: 'string',
        writable: true,
        observable: true
    }, "initialization string");

    thing.addProperty("wrongWritable", {
        description:"property that says writable but isn't",
        type: 'number',
        writable: true,
        observable: true
    }, 15);

    thing.setPropertyWriteHandler("wrongWritable",()=>{
        return new Promise(function (resolve, reject) {
            console.log("Writing the old value");
            thing.properties["wrongWritable"].write(15);
            resolve(15);
        });
        // return thing.properties["wrongWritable"].write(15).then(() => 15, () => false);
    })

    thing.addProperty("wrongDataTypeNumber", {
        description:"property that returns a different data type than the one described",
        type: 'number',
        writable: false,
        observable: true
    }, "this is not a number");

    thing.addProperty("wrongDataTypeObject", {
        description: "property that doesn't return a key that is required",
        type: 'object',
        properties: {
            "brightness": {
                type: "number",
                minimum: 0.0,
                maximum: 100.0
            },
            "status": {
                type: "string"
            }
        },
        required:["brightness","status"],
        writable: true
    }, {
        "brightness": 99.99
    });

    thing.addProperty("testArray", {
        type: "array",
        items: {
            type: "number"
        },
        writable: true
    }, [12, 15, 10]);

    thing.addAction("setCounter", {
        input: {
            type: 'number'
        }
    }, (input) => {
        console.log("* ACTION HANDLER FUNCTION for setCounter");
        console.log("* ", input);
        return thing.properties["counter"].write(input).then(() => {
            console.log('* Set counter successful');
            return
        }).catch(() => {
            console.log('* Set counter failed');
            return
        });
    });

    thing.addAction("getTemperature", {
        output: {
            type: "number"
        }
    }, () => {
        console.log("* ACTION HANDLER FUNCTION for getTemp");
        return thing.properties["temperature"].read().then((temp) => {
            console.log('* getTemperature successful');
            return temp;
        }).catch(() => {
            console.log('* getTemperature failed');
            return 0;
        });
    });

    thing.addAction("setDisplay", {
        input: {
            type: "string"
        },
        output: {
            type: "string"
        }
    },
    (input) => {
        console.log("* ACTION HANDLER FUNCTION for setDisplay");
        console.log("* ", input);
        return new Promise((resolve, reject) => {
            resolve("Display set");
        });
    });

    thing.addAction("setTestObject", {
        input: {
            type: "object",
            properties: {
                "brightness": {
                    type: "number",
                    minimum: 0.0,
                    maximum: 100.0
                },
                "status": {
                    type: "string"
                }
            }
        }
    }, (input) => {
        console.log("* ACTION HANDLER FUNCTION for setTestObject");
        console.log("* ", input);
        return thing.properties["testObject"].write(input).then(() => input, () => false);
    });

    thing.addAction("longTakingAction", {
        "description":"Action that can fail because of taking longer than usual (5s)",
        input: {
            type: "array",
            items: {
                type: "number"
            }
        },
        output: {
            type: "array",
            items: {
                type: "number"
            }
        }
    }, (input) => {
        console.log("* ACTION HANDLER FUNCTION for longTakingAction");
            var promise1 = new Promise(function (resolve, reject) {
                setTimeout(resolve, 5000, input);
            });
            return promise1;
    });

    thing.addEvent("onChange", {
        type: "number"
    });

    thing.expose().then(() => {
        console.info(thing.name + " ready");
    });
}).catch(err => {
    throw "Couldnt connect to servient"
});