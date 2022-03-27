
var Test = require('../config/testConfig.js');
var BigNumber = require('bignumber.js');

contract('Flight Surety Tests', async (accounts) => {

  var config;
  before('setup contract', async () => {
    config = await Test.Config(accounts);
  await config.flightSuretyData.authorizeCaller(config.flightSuretyApp.address);
  });

  /****************************************************************************************/
  /* Operations and Settings                                                              */
  /****************************************************************************************/

  it(`(multiparty) has correct initial isOperational() value`, async function () {

    // Get operating status
    let status = await config.flightSuretyData.isOperational.call();
    assert.equal(status, true, "Incorrect initial operating status value");

  });

  it(`(multiparty) can block access to setOperatingStatus() for non-Contract Owner account`, async function () {

      // Ensure that access is denied for non-Contract Owner account
      let accessDenied = false;
      try 
      {
          await config.flightSuretyData.setOperatingStatus(false, { from: config.testAddresses[2] });
      }
      catch(e) {
          accessDenied = true;
      }
      assert.equal(accessDenied, true, "Access not restricted to Contract Owner");
            
  });

  it(`(multiparty) can allow access to setOperatingStatus() for Contract Owner account`, async function () {

      // Ensure that access is allowed for Contract Owner account
      let accessDenied = false;
      try 
      {
          await config.flightSuretyData.setOperatingStatus(false);
      }
      catch(e) {
          accessDenied = true;
      }
      assert.equal(accessDenied, false, "Access not restricted to Contract Owner");
      
  });

  it(`(multiparty) can block access to functions using requireIsOperational when operating status is false`, async function () {

      await config.flightSuretyData.setOperatingStatus(false);

      let reverted = false;
      try 
      {
          await config.flightSurety.setTestingMode(true);
      }
      catch(e) {
          reverted = true;
      }
      assert.equal(reverted, true, "Access not blocked for requireIsOperational");      

      // Set it back for other tests to work
      await config.flightSuretyData.setOperatingStatus(true);

  });

  it('(airline) cannot register an Airline using registerAirline() if it is not funded', async () => {
    
    // ARRANGE
    let newAirline = accounts[2];

    // ACT
    try {
        await config.flightSuretyApp.registerAirline(newAirline, 'SecondAirline' ,{from: config.firstAirline});
    }
    catch(e) {

    }
    let result = await config.flightSuretyData.isAirlineRegistered.call(newAirline); 

    // ASSERT
    assert.equal(result, false, "Airline should not be able to register another airline if it hasn't provided funding");

  });
  
  it('(airline) can register an Airline using registerAirline() after it is funded with at least 10 ether', async () => {
    
    // ARRANGE
    let newAirline2 = accounts[3];
    const funding_value = web3.utils.toWei("10", "ether");

    // ACT
    try {
       
        await config.flightSuretyApp.fundAirline(config.firstAirline, {from:config.firstAirline, value: funding_value, gasPrice: 0});
        await config.flightSuretyApp.registerAirline(newAirline2, 'SecondAirline' ,{from: config.firstAirline});
        // let amount = await config.flightSuretyData.getFunds.call(config.firstAirline);
        // console.log(amount.toString());
    }
    catch(e) {

    }
    let result = await config.flightSuretyData.isAirlineRegistered.call(newAirline2); 

    // ASSERT
    assert.equal(result, true, "Airline was not able to register new airline even though it was funded");

  });


  it('(airline) cannot register a 5th Airline using registerAirline() without multisig', async () => {
    
    // ARRANGE
    const funding_value = web3.utils.toWei("10", "ether");
    let newAirline3 = accounts[4];
    let newAirline4 = accounts[5];
    let newAirline5 = accounts[6];

    // ACT
    try {
       
        await config.flightSuretyApp.fundAirline(config.firstAirline, {from:config.firstAirline, value: funding_value, gasPrice: 0});
        await config.flightSuretyApp.registerAirline(newAirline3, 'ThirdAirline' ,{from: config.firstAirline});
        await config.flightSuretyApp.registerAirline(newAirline4, 'FourthAirline' ,{from: config.firstAirline});
        
        //now try to add 5th airline. This should result in a vote for the airline.
        await config.flightSuretyApp.registerAirline(newAirline5, 'FifthAirline' ,{from: config.firstAirline});
    

    }
    catch(e) {
       

    }
    let result = await config.flightSuretyData.isAirlineRegistered.call(newAirline5); 

    // ASSERT
    assert.equal(result, false, "5th airline got registered without multisig");

  });


  it('(airline) can register a 5th Airline using registerAirline() with multisig', async () => {
    
    // ARRANGE
    const funding_value = web3.utils.toWei("10", "ether");
    let newAirline2 = accounts[3];
    let newAirline3 = accounts[4];
    let newAirline4 = accounts[5];
    let newAirline5 = accounts[6];

    //fund second airline, so second vote can be casted, which allows the new airline to be registered
    await config.flightSuretyApp.fundAirline(newAirline2, {from:newAirline2, value: funding_value, gasPrice: 0});
    // await config.flightSuretyApp.fundAirline(newAirline3, {from:newAirline3, value: funding_value, gasPrice: 0});
    // await config.flightSuretyApp.fundAirline(newAirline4, {from:newAirline4, value: funding_value, gasPrice: 0});
    // ACT
    try {
       

        //now try to add 5th airline with second airline which gives the fifth airline a second vote (sufficient for approval).
        await config.flightSuretyApp.registerAirline(newAirline5, 'FifthAirline' ,{from: newAirline2});
        // await config.flightSuretyApp.registerAirline(newAirline5, 'FifthAirline' ,{from: newAirline3});

    

    }
    catch(e) {
    }
    let result = await config.flightSuretyData.isAirlineRegistered.call(newAirline5); 

    // ASSERT
    assert.equal(result, true, "5th airline got registered without multisig");

  });

  it('(airline) cannot register a flight if its not funded', async () => {
    
    let flight = 'ND1309';
    let departureTime = Math.floor(Date.now() / 1000);
    let thirdAirline = accounts[4]   // this accounts was registered as third airline but without funding
    


    // ACT
    try {
       
        await config.flightSuretyApp.registerFlight(flight, departureTime, {from: thirdAirline});
    }
    catch(e) {
    }
    //See if flight is registered
    let registeredFlight = await config.flightSuretyApp.isRegisteredFlight.call(thirdAirline, flight, departureTime,{from:thirdAirline});
    // ASSERT
    assert.equal(registeredFlight, false, "Airline was able to register new flight even though it was not funded");

  });

  it('(airline) can register a flight when its funded', async () => {
    
    let flight = 'ND1309'
    let departureTime = Math.floor(Date.now() / 1000);
   
    


    // ACT
    try {
        // register flight for firstAirline which is funded
        await config.flightSuretyApp.registerFlight(flight, departureTime, {from:config.firstAirline});

    }
    catch(e) {

    }
    //See if flight is registered
    let registeredFlight = await config.flightSuretyApp.isRegisteredFlight.call(config.firstAirline, flight, departureTime,{from: config.firstAirline});
    // ASSERT
    assert.equal(registeredFlight, true, "Airline was not able to register new flight");

  });

  
 

  //Can buy insurance

  it(' (passenger) can buy an insurance for a flight', async () => {
    
    let flight = 'ND1311';
    let departureTime = Math.floor(Date.now() / 1000);
    let passenger = accounts[7];
    let passengerName = 'TestPassenger';
    const insurance_value = web3.utils.toWei("0.5", "ether");
       
    //register new flight for firstAirline
    await config.flightSuretyApp.registerFlight(flight, departureTime, {from:config.firstAirline});

    // ACT
    try {
       
        //buy insurance for a passenger
        config.flightSuretyApp.buy(config.firstAirline, flight, departureTime, passengerName, {from: passenger, value: insurance_value});
    }
    catch(e) {

    }
    //See if passenger is insured
    let insuredPassenger = await config.flightSuretyApp.isInsuredPassenger.call(passenger, flight, departureTime, config.firstAirline);
    // ASSERT
    assert.equal(insuredPassenger, true, "Passenger does not seem to be insured");

  });

//   it(' (airline) can credit its insurees', async () => {
    
//     let flight = 'ND1311';
//     let departureTime = Math.floor(Date.now() / 1000);
//     let passenger = accounts[7];
//     let passengerName = 'TestPassenger';
//     const insurance_value = web3.utils.toWei("0.5", "ether");
       
//     //register new flight for firstAirline
//     await config.flightSuretyApp.registerFlight(flight, departureTime, {from:config.firstAirline});

//     // ACT
//     try {
       
//         //buy insurance for a passenger
//         config.flightSuretyApp.processFlightStatus(config.firstAirline, flight, departureTime, statusCode);
//     }
//     catch(e) {

//     }
//     //See if passenger is insured
//     let insuredPassenger = await config.flightSuretyApp.isInsuredPassenger.call(passenger, flight, departureTime, config.firstAirline);
//     // ASSERT
//     assert.equal(insuredPassenger, true, "Passenger does not seem to be insured");

//   });


  //Can credit insurees

  //can withdraw credit to insuree wallet


  


});
