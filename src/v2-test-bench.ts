import _ from '@node-wot/core/node_modules/wot-typescript-definitions';
import {Servient} from '@node-wot/core';
import {HttpClientFactory} from "@node-wot/binding-http";
import {CoapClientFactory} from "@node-wot/binding-coap";
import {HttpServer} from '@node-wot/binding-http';
import {CoapServer} from "@node-wot/binding-coap";
import {Thing} from '@node-wot/td-tools';
import * as TDParser from '@node-wot/td-tools';
// import * as TdFunctions from './tdFunctions';
import fs = require('fs');
import { Tester } from './Tester'
import {convertTDtoNodeWotTD040} from './convertTDs';

// a test config file is always configured like this
export interface testConfig {
    TBname?: string;
    SchemaLocation?: string;
    TestReportsLocation?: string;
    TestDataLocation?: string;
    Scenarios?: number;
    Repetitions?: number;
}

//getting the test config and extraction anything possible
let testConfig: testConfig = JSON.parse(fs.readFileSync('./test-config.json', "utf8"));
let tbName: string = testConfig["TBname"];

//creating the Test Bench as a servient. It will test the Thing as a client and interact with the tester as a Server
let srv = new Servient();
srv.addServer(new HttpServer());
srv.addServer(new CoapServer());
srv.addClientFactory(new HttpClientFactory());
srv.addClientFactory(new CoapClientFactory());
srv.start().then(WoT=>{
    console.log('\x1b[36m%s\x1b[0m', '* TestBench servient started');
    let TestBenchT = WoT.produce({
        name: tbName,
    });
    // inits:
    let tester: Tester = null;

    // infos of testbench configurations:
    TestBenchT.addProperty({
        name : "testConfig",
        schema : '{"type": "string"}',
        writable : true
    });
    TestBenchT.writeProperty("testConfig", testConfig);
    TestBenchT.addProperty({
        name : "thingUnderTestTD",
        schema : '{"type": "string"}',
        writable : true
    });

    TestBenchT.addProperty({
        name : "testData",
        schema : '{"type": "string"}',
        writable : true
    });

    // initiate testbench:
    TestBenchT.addAction({
        name: "initiate",
        outputSchema: '{ "type": "boolean" }'
    });
    TestBenchT.setActionHandler("initiate", () => {
        //consume thing and add Tester:
        return TestBenchT.readProperty('thingUnderTestTD').then((tut) => {
            tut = JSON.stringify(tut);
            console.log('$$$$$$$', tut);
            if (tut != null) {
                // ---------------------------------- CONVERTING !! TAKE NEW NODE WOT
                let convertedTD: string = convertTDtoNodeWotTD040(tut);
                let tutTd: Thing = TDParser.parseTDString(convertedTD);
                let consumedTuT: WoT.ConsumedThing = WoT.consume(convertedTD);
                tester = new Tester(testConfig, tutTd, consumedTuT);
                return new Promise((resolve, reject) => {
                    if (tester.initiate()) {
                        // additionally update testData property with generated data:
                        TestBenchT.writeProperty('testData', tester.codeGen.getRequests(testConfig.TestDataLocation)).then(() => resolve(true), () => reject(false));
                    } else {
                        reject(false);
                    }
                });
            } else {
                return new Promise((resolve, reject) => {reject(false);});
            }
        });
    });

    TestBenchT.addProperty({
        name : "testReport",
        schema : '{ "type": "string"}',
        writable : false
    });

    // test a thing action:
    TestBenchT.addAction({
        name: "testThing",
        inputSchema: '{ "type": "boolean" }',
        outputSchema: '{ "type": "boolean" }'
    });
    // testing a thing action handler, input boolean for logMode:
    // if input true, logMode is on
    TestBenchT.setActionHandler("testThing", function(input) {
        return new Promise((resolve, reject) => {
            console.log('\x1b[36m%s\x1b[0m', '* --------------------- START OF TESTTHING METHOD ---------------------')
            tester.testThing(testConfig.Repetitions, testConfig.Scenarios, input).then(testReport => {
                testReport.printResults();
                testReport.storeReport(testConfig.TestReportsLocation);
                TestBenchT.writeProperty("testReport",testReport.getResults());
                resolve(true);
            }).catch(() => {
                console.log('\x1b[36m%s\x1b[0m', "* Something went wrong");
                reject(false);
            });
        });
    });

    // until here......... need to add one property for TuT Thing Description

}).catch(err => { throw "Couldnt connect to one servient" });



////////// code backup:

// TestBenchT.setActionHandler("updateTestData", function(requestsUpdate: string) {
//         fs.writeFileSync(testConfig.TestDataLocation, JSON.stringify(requestsUpdate, null, ' '));
//         var p = TestBenchT.writeProperty('testData', requestsUpdate);
//         return p.then(() => true, () => false);
//     });

//     