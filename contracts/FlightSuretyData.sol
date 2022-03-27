pragma solidity >=0.4.25;

import "../node_modules/openzeppelin-solidity/contracts/math/SafeMath.sol";

contract FlightSuretyData {
    using SafeMath for uint256;

    /********************************************************************************************/
    /*                                       DATA VARIABLES                                     */
    /********************************************************************************************/

    address private contractOwner;                                      // Account used to deploy contract
    bool private operational = true;                                    // Blocks all state changes throughout the contract if false
    uint256 airlineCount;

    struct Airline {
        address airlineAddress;
        bool isRegistered;
        string airlineName;
        address[] voted;
        uint256 funds;
    }

    struct Passenger {
        string name;
        address wallet;
        uint256 credit;
        mapping(bytes32 => uint256) flightInsurances;        
    }
    mapping(bytes32 => address[]) private passengersInsuredForFlight;
    mapping (address => Passenger) private passengers;
    mapping(address => Airline) private airlines;
    
    mapping(address => bool) authorizedContracts;

    uint8 private constant MULTIPARTY_MIN_AIRLINES = 4;
    uint256 private constant AIRLINE_MIN_FUNDS = 10 ether;
    uint256 private constant max_insurance_amount = 1 ether;


    /********************************************************************************************/
    /*                                       EVENT DEFINITIONS                                  */
    /********************************************************************************************/


    /**
    * @dev Constructor
    *      The deploying account becomes contractOwner
    */
    constructor
                                (address firstAirline 
                                ) 
                                public 
    {
        contractOwner = msg.sender;
         airlines[firstAirline] = Airline({
            airlineAddress : firstAirline,
            isRegistered : true,
            airlineName : "MyFirstAirline",
            voted : new address[](0),
            funds: 0
        });

        airlineCount = 1;
    }

    /********************************************************************************************/
    /*                                       FUNCTION MODIFIERS                                 */
    /********************************************************************************************/

    // Modifiers help avoid duplication of code. They are typically used to validate something
    // before a function is allowed to be executed.

    /**
    * @dev Modifier that requires the "operational" boolean variable to be "true"
    *      This is used on all state changing functions to pause the contract in 
    *      the event there is an issue that needs to be fixed
    */
    modifier requireIsOperational() 
    {
        require(operational, "Contract is currently not operational");
        _;  // All modifiers require an "_" which indicates where the function body will be added
    }

    /**
    * @dev Modifier that requires the "ContractOwner" account to be the function caller
    */
    modifier requireContractOwner()
    {
        require(msg.sender == contractOwner, "Caller is not contract owner");
        _;
    }

     modifier isAuthorizedCaller()
    {
        
        require(authorizedContracts[msg.sender] == true, "Caller is not authorized");
        _;
    }

    /********************************************************************************************/
    /*                                       UTILITY FUNCTIONS                                  */
    /********************************************************************************************/

    /**
    * @dev Get operating status of contract
    *
    * @return A bool that is the current operating status
    */      
    function isOperational() 
                            external
                            view 
                            returns(bool) 
    {
        return operational;
    }

    function getFunds(address airline) external view returns(uint256){
        uint256 amount = airlines[airline].funds;
        return amount;
    }

    /**
    * @dev Sets contract operations on/off
    *
    * When operational mode is disabled, all write transactions except for this one will fail
    */    
    function setOperatingStatus(bool mode) 
                            external
                            requireContractOwner 
    {
        operational = mode;
    }
    
    function authorizeCaller(address appContract)
                            requireContractOwner
                            external

    {
        authorizedContracts[appContract] = true;
    }

    function isAirlineRegistered(address airline) external view requireIsOperational returns(bool){
        bool isAirline = false;
        if(airlines[airline].isRegistered == true){
            isAirline = true;
        }
        return isAirline;
    }

    function isFunded(address airline) external view returns(bool)
    {
        bool funded = false;
        if(airlines[airline].funds >= AIRLINE_MIN_FUNDS){
            funded = true;
        }
        return funded;
    }

    function isInsuredPassenger(bytes32 flightKey, address passenger) external view returns(bool){
        
        bool insured = false;
        if(passengers[passenger].flightInsurances[flightKey] > 0){
            insured = true;
        }
        return insured;
    }
    /********************************************************************************************/
    /*                                     SMART CONTRACT FUNCTIONS                             */
    /********************************************************************************************/

   /**
    * @dev Add an airline to the registration queue
    *      Can only be called from FlightSuretyApp contract
    *
    */   
    function registerAirline
                            (address newAddress, string name, address voter 
                            )
                            requireIsOperational
                            isAuthorizedCaller
                            external
                            returns (bool) 
                            
    {

        require(newAddress != address(0), "'airlineAddress' must be a valid address.");
        require(!airlines[newAddress].isRegistered, "Airline is already registered.");
        if(airlineCount < MULTIPARTY_MIN_AIRLINES){ // no multisig required
            airlines[newAddress] = Airline({
            airlineAddress : newAddress,
            isRegistered : true,
            airlineName : name,
            voted: new address[](0),
            funds: 0
        });
        airlineCount ++;
        }


        else{ //if the nr of airlines is > 4, meaning that multisig is required
            bool isDuplicate = false; //check if the requestor already voted for this airline to be added
            for (uint c=0; c <airlines[newAddress].voted.length; c++){
                if (airlines[newAddress].voted[c] == voter){
                    isDuplicate = true;
                    break;
                }
            }
            require(!isDuplicate, "This party has already voted");
            //push requestor to array of addresses that voted
            airlines[newAddress].voted.push(voter);
            //check if limit has been reached and if so, set registration to true.
            if(airlines[newAddress].voted.length >= airlineCount.div(2)) {
                airlines[newAddress].isRegistered = true;
                airlines[newAddress].airlineName = name;
                airlines[newAddress].airlineAddress = newAddress;
                
                airlineCount ++;
            }
        }
        return (true);
    }


   /**
    * @dev Buy insurance for a flight
    *
    */   
    function buy (bytes32 flightKey, string passengerName, address passengerAddress)                         
                            requireIsOperational
                            isAuthorizedCaller
                            external
                            payable
    {
            require(msg.value > 0, "One should at least deposit some money to insure him or herself");
            require(msg.value <= max_insurance_amount, "One cannot insurance for more than 1 ETH");

            passengers[passengerAddress] = Passenger({
                name : passengerName,
                wallet : passengerAddress,
                credit : 0                
            });
            // add insured value to passenger data
            passengers[passengerAddress].flightInsurances[flightKey] = msg.value;
            //add passenger to list of people that insured themselves for the specific flight, so that when crediting we do not need to loop over all passengers
            passengersInsuredForFlight[flightKey].push(msg.sender);
            
    }

    /**
     *  @dev Credits payouts to insurees
    */
    function creditInsurees
                                (
                                    bytes32 flightKey
                                )
                                requireIsOperational
                                isAuthorizedCaller
                                external
    
    {

        for (uint256 c = 0; c < passengersInsuredForFlight[flightKey].length; c++) {
            address insuredPassengerAddress = passengersInsuredForFlight[flightKey][c];
            if(passengers[insuredPassengerAddress].flightInsurances[flightKey] != 0) {

                uint256 currentCredit = passengers[insuredPassengerAddress].credit;
                uint256 insuranceAmount = passengers[insuredPassengerAddress].flightInsurances[flightKey];
                passengers[insuredPassengerAddress].flightInsurances[flightKey] = 0; //reset to 0
                passengers[insuredPassengerAddress].credit = currentCredit + insuranceAmount + insuranceAmount.div(2); //credit passenger

            }
            }
    }
    

    /**
     *  @dev Transfers eligible payout funds to insuree
     *
    */
    function pay
                            (address insuredPassenger
                            )
                            requireIsOperational
                            isAuthorizedCaller
                            external
                            {
    require(msg.sender == insuredPassenger, 'Only passenger can withdraw his own credit');                            
    require(passengers[insuredPassenger].credit > 0, 'You do not have any credit to withdraw');
    uint256 credit = passengers[insuredPassenger].credit;
    passengers[insuredPassenger].credit = 0; //reset credit first
    insuredPassenger.transfer(credit); //payout 
    }

   /**
    * @dev Initial funding for the insurance. Unless there are too many delayed flights
    *      resulting in insurance payouts, the contract should be self-sustaining
    *
    */   
    function fund (address airline, uint256 amount)
                            requireIsOperational
                            isAuthorizedCaller
                            external
                            returns (uint256)
    {
      airlines[airline].funds += amount;
      return airlines[airline].funds;
    }

    // function getFlightKey
    //                     (
    //                         address airline,
    //                         string memory flight,
    //                         uint256 timestamp
    //                     )
    //                     pure
    //                     internal
    //                     returns(bytes32) 
    // {
    //     return keccak256(abi.encodePacked(airline, flight, timestamp));
    // }

    /**
    * @dev Fallback function for funding smart contract.
    *
    */
    function () 
                            external 
                            payable 
    {
        
    }


}

