
import DOM from './dom';
import Contract from './contract';
import './flightsurety.css';


(async() => {

    let result = null;

    let contract = new Contract('localhost', () => {

        // Read transaction
        contract.isOperational((error, result) => {
            console.log(error,result);
            display('Operational Status', 'Check if contract is operational', [ { label: 'Operational Status', error: error, value: result} ]);
        });
    

        // User-submitted transaction
        DOM.elid('submit-oracle').addEventListener('click', () => {
            let flight = DOM.elid('flight-number').value;
            // Write transactionS
            contract.fetchFlightStatus(flight,(error, result) => {
                display('Oracles', 'Trigger oracles', [ { label: 'Fetch Flight Status', error: error, value: result.flight + ' ' + result.timestamp} ]);
            });
        })


        //
        // DOM.elid('submit-airline').addEventListener('click', () => {
        //     let name = DOM.elid('airline-name').value;
        //     let address = DOM.elid('airline-address').value;
        //     // Write transaction
        //     contract.registerAirline(address, name, (error, result) => {
        //         display('Airlines', 'Registered airlines', [ { label: 'Airline', error: error, value: result.airlineName + ' with address ' + result.airlineAddress + ' has been registered.'} ]);
        //         if(error){
        //             console.log(error);
        //         }
        //     });
        // })

        // DOM.elid('fund-airline').addEventListener('click', () => {
        //     let address = DOM.elid('airline-address-to-fund').value;
        //     console.log(address);
        //     // Write transaction
        //     contract.fundAirline(address, (error, result) => {
        //         display('Airlines', 'Funded airlines', [ { label: 'Airline', error: error, value: result.airlineName + ' with address ' + result.airlineAddress + ' has been funded.'} ]);
        //         if(error){
        //             console.log(error);
        //         }
        //     });
        // })

        // DOM.elid('register-flight').addEventListener('click', () => {
        //     let flightName = DOM.elid('flight').value;
        //     let flightTimestamp = DOM.elid('timestamp').value;
        //     let flightAirline = DOM.elid('flight-airline').value;
        //     // Write transaction
        //     contract.registerFlight(flightName, flightTimestamp, flightAirline, (error, result) => {
        //         display('Airlines', 'Registered Flight', [ { label: 'Flight has been registered'} ]);
        //         if(error){
        //             console.log(error);
        //         }
        //     });
        // })

        DOM.elid('insure-flight').addEventListener('click', () => {
            let flightName = DOM.elid('select-flight').value;
            let insurance_value = DOM.elid('insurance-value').value;
            let passenger_name = DOM.elid('passenger-name').value;
            console.log(flightName, insurance_value);

            // Write transaction
             contract.buyInsurance(flightName, insurance_value, passenger_name, (error, result) => {
                display('Passenger', 'Insure Flight', [ { label: 'Flight has been Insured'}]);
                if(error){
                    console.log(error);
                }
            });
        })


    
    });
    

})();


function display(title, description, results) {
    let displayDiv = DOM.elid("display-wrapper");
    let section = DOM.section();
    section.appendChild(DOM.h2(title));
    section.appendChild(DOM.h5(description));
    results.map((result) => {
        let row = section.appendChild(DOM.div({className:'row'}));
        row.appendChild(DOM.div({className: 'col-sm-4 field'}, result.label));
        row.appendChild(DOM.div({className: 'col-sm-8 field-value'}, result.error ? String(result.error) : String(result.value)));
        section.appendChild(row);
    })
    displayDiv.append(section);

}







