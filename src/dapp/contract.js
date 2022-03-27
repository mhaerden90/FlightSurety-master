import FlightSuretyApp from '../../build/contracts/FlightSuretyApp.json';
import FlightSuretyData from '../../build/contracts/FlightSuretyData.json';
import Config from './config.json';
import Web3 from 'web3';

export default class Contract {
    constructor(network, callback) {

        let config = Config[network];
        this.web3 = new Web3(new Web3.providers.HttpProvider(config.url));
        this.flightSuretyApp = new this.web3.eth.Contract(FlightSuretyApp.abi, config.appAddress);
        this.flightSuretyData = new this.web3.eth.Contract(FlightSuretyData.abi, config.dataAddress);
        this.initialize(callback);
        this.owner = null;
        this.airlines = [];
        this.passengers = [];
        this.firstAirline = config.firstAirline;
        this.appAddress = config.appAddress;
        this.flights = ['ND1309', 'ND1310', 'ND1311', 'ND1312'];
        this.firstFlightsTimestamp = Math.floor(Date.now() / 1000);
    }

    async initialize(callback) {
        if (window.ethereum) {
            try {
                this.web3 = new Web3(window.ethereum);
                // Request account access
                await window.ethereum.enable();
            } catch (error) {
                // User denied account access...
                console.error("User denied account access")
            }
        }
        if (typeof this.web3 == "undefined") {
            this.web3 = new Web3(new Web3.providers.HttpProvider("http://127.0.0.1:7545"));
            console.log("local ganache provider");
        }
 
        this.web3.eth.getAccounts((error, accts) => {
            console.log(accts);
            this.owner = accts[0];
            let counter = 1;
            
            while(this.airlines.length < 5) {
                this.airlines.push(accts[counter++]);
            }

            while(this.passengers.length < 5) {
                this.passengers.push(accts[counter++]);
            }
            let result = this.flightSuretyData.methods.authorizeCaller(this.appAddress).send({from: this.owner});
            let funding_value = this.web3.utils.toWei("10", "ether");
            let funded = this.flightSuretyApp.methods.fundAirline(this.firstAirline).send({from: this.firstAirline, value: funding_value});
            try{
                for(let i=0; i < this.flights.length; i++){
                    let flight = this.flights[i];
                    let timestamp = this.firstFlightsTimestamp;
                    console.log(flight, timestamp, this.firstAirline);
                    this.flightSuretyApp.methods.registerFlight(flight, timestamp).send({from: this.firstAirline,gas: 5000000,
                        gasPrice: 20000});
                }
            }
            
            catch (error){
                console.log(error);
            }
           
            console.log(result);
            callback();
        });
    }

    isOperational(callback) {
       let self = this;
       self.flightSuretyApp.methods
            .isOperational()
            .call({ from: self.owner}, callback);
    }
    registerAirline(address, name, callback){
        let self = this;
        let payload = {
            airlineName : name,
            airlineAddress : address
        }
        self.flightSuretyApp.methods
            .registerAirline(payload.airlineAddress, payload.airlineName)
            .send({from: self.owner, gas: 5000000,
                gasPrice: 20000000}, (error, result) =>{
                callback(error, payload)
            
            });

    }

   fundAirline(address, callback){
        let funding_value = this.web3.utils.toWei("10", "ether"); //adding some value for front end so no real metamask connection is needed
        let self = this;
        let payload = {
            airlineAddress : address
        }
        console.log(payload);
        self.flightSuretyApp.methods
            .fundAirline(payload.airlineAddress)
            .send({from: self.owner, value: funding_value, gas: 5000000,
                gasPrice: 20000000}, (error, result) =>{
                callback(error, payload)
            
            });

    }

    registerFlight(flightName, flightTimestamp, flightAirline, callback){
        let self = this;
        let payload = {
            flight : flightName,
            timestamp : flightTimestamp,
            airline : flightAirline
        }

        self.flightSuretyApp.methods
            .registerFlight(payload.flight, payload.timestamp)
            .send({from: payload.airline, gas: 5000000,
                gasPrice: 20000000}, (error, result) =>{
                callback(error, payload)
            
            });
    }

    fetchFlightStatus(flight, callback) {
        let self = this;
        let payload = {
            airline: this.firstAirline,
            flight: flight,
            timestamp: this.firstFlightsTimestamp
        } 
        console.log(payload);
        self.flightSuretyApp.methods
            .fetchFlightStatus(payload.airline, payload.flight, payload.timestamp)
            .send({ from: self.owner}, (error, result) => {
                callback(error, payload);
            });
    }

    buyInsurance(flight, insurance_value, passenger_name, callback)
    {
    let self = this;
    let insuranceValueInWei = this.web3.utils.toWei(insurance_value.toString(), "ether");
        let payload = {
            airline: this.firstAirline,
            flight: flight,
            timestamp: this.firstFlightsTimestamp,
            insuranceValue: insuranceValueInWei,
            passengerName: passenger_name
        } 
        console.log(payload);
        self.flightSuretyApp.methods  //address airline, string flight, uint256 timestamp, string passengerName
            .buy(payload.airline, payload.flight, payload.timestamp, payload.passengerName)
            .send({ from: this.owner, value:payload.insuranceValue, gas: 5000000,
                gasPrice: 20000000}, (error, result) => {
                callback(error, payload);
            });

    }
}