// SPDX-License-Identifier: MIT
// This line specifies the license for this code - MIT is an open-source license

pragma solidity ^0.8.0;

/**
 * these type of comments are called NatSpec comments
 * NatSpec comments are used to provide detailed documentation for smart contracts
 */

/**
 * @title ExpenseTracker
 * @dev A decentralized application (DApp) for college students to track and split expenses
 * All data is stored on-chain, making it transparent and immutable
 */

// This contract allows users to register, add expenses, update names, and settle debts
contract ExpenseTracker {
    /**
     * @dev Person struct represents a user in the system
     * @param name The user's name
     * @param walletAddress The Ethereum address of the user's wallet
     * @param isRegistered Flag indicating if the person is registered
     */
    struct Person {
        string name;
        address walletAddress; // Storing the address explicitly can be helpful
        bool isRegistered;    // Explicit flag for registration status
    }

    /**
     * @dev Expense struct represents a shared expense
     * @param id Unique identifier for the expense
     * @param label Description of what the expense was for
     * @param timestamp When the expense was recorded (in Unix time)
     * @param amountPaid Mapping of addresses to amounts each person paid (in wei)
     * @param amountOwed Mapping of addresses to amounts each person owes (in wei)
     * @param participants Array of addresses of people involved in this expense
     */
    struct Expense {
        uint256 id;
        string label;
        uint256 timestamp;
        mapping(address => uint256) amountPaid; // What each person actually paid
        mapping(address => uint256) amountOwed; // What each person should have paid (their fair share)
        address[] participants; // List of people involved in this expense
    }

    // --- State Variables ---

    // Storage for all expenses, mapped by their unique ID
    mapping(uint256 => Expense) private expenses;

    // Storage for all registered people, mapped by their wallet address
    mapping(address => Person) private people;

    // Array to keep track of all registered wallet addresses for iteration/counting
    address[] private registeredPeople;

    // Counter for expense IDs, also gives us the total number of expenses + 1
    uint256 public expenseCount;

    // --- Events ---

    // Emitted when a new person registers
    event PersonRegistered(address indexed walletAddress, string name);

    // Emitted when a new expense is added
    event ExpenseAdded(uint256 indexed expenseId, string label);

    // Emitted when someone settles a debt (transfers ETH)
    event DebtSettled(address indexed from, address indexed to, uint256 amount);

    // Emitted when a person updates their name
    event PersonNameUpdated(address indexed walletAddress, string newName);

    // --- Functions ---

    /**
     * @dev Register a new person in the expense tracker. Sets the caller as registered.
     * @param _name The name of the person.
     */
    function registerPerson(string memory _name) public {
        require(bytes(_name).length > 0, "Name cannot be empty");
        // Check the explicit registration flag
        require(!people[msg.sender].isRegistered, "Person already registered");

        // Create and store the new person information
        people[msg.sender] = Person(_name, msg.sender, true); // Set isRegistered flag

        // Add to the list of registered people
        registeredPeople.push(msg.sender);

        // Emit event for front-end apps
        emit PersonRegistered(msg.sender, _name);
    }

    /**
     * @dev Add a new shared expense to the tracker. Amounts are expected in wei.
     * @param _label Description of the expense.
     * @param _participants Array of addresses of people involved in this expense.
     * @param _amountsPaid Array of amounts (in wei) each participant paid.
     * @param _amountsOwed Array of amounts (in wei) each participant owes (their fair share).
     */
    function addExpense(
        string memory _label,
        address[] memory _participants,
        uint256[] memory _amountsPaid,
        uint256[] memory _amountsOwed
    ) public {
        // --- Input Validation ---
        require(bytes(_label).length > 0, "Label cannot be empty");
        require(_participants.length > 0, "Expense must have participants");
        require(
            _participants.length == _amountsPaid.length,
            "Participants and amounts paid arrays must have the same length"
        );
        require(
            _participants.length == _amountsOwed.length,
            "Participants and amounts owed arrays must have the same length"
        );

        // --- Create Expense ---
        // expenseCount is the *next* available ID, so use it directly
        uint256 expenseId = expenseCount;
        Expense storage newExpense = expenses[expenseId];

        // Set the basic expense information
        newExpense.id = expenseId;
        newExpense.label = _label;
        newExpense.timestamp = block.timestamp; // Current block time (Unix timestamp)

        // Add each participant's data to the expense mappings
        for (uint256 i = 0; i < _participants.length; i++) {
            address participantAddr = _participants[i];
            // Ensure participant address is valid
            require(participantAddr != address(0), "Invalid participant address provided");
            // Optional: Check if participant is registered (depends on requirements)
            // require(people[participantAddr].isRegistered, "Participant not registered");

            newExpense.participants.push(participantAddr);
            newExpense.amountPaid[participantAddr] = _amountsPaid[i];
            newExpense.amountOwed[participantAddr] = _amountsOwed[i];
        }

        // Increment the expense counter *after* successfully adding the expense
        expenseCount++;

        // Emit event for front-end apps
        emit ExpenseAdded(expenseId, _label);
    }

    /**
     * @dev Get information about a specific person.
     * @param _addr Address of the person to look up.
     * @return name The person's name.
     * @return walletAddress The person's wallet address.
     * @return isRegistered_ True if the person is registered.
     */
    function getPerson(
        address _addr
    ) public view returns (string memory name, address walletAddress, bool isRegistered_) {
        Person storage p = people[_addr];
        // Return details from storage, using _addr if walletAddress wasn't stored explicitly
        return (p.name, p.walletAddress == address(0) ? _addr : p.walletAddress, p.isRegistered);
    }

    /**
     * @dev Get the list of participants (addresses) involved in a specific expense.
     * @param _expenseId ID of the expense.
     * @return Array of participant addresses.
     */
    function getExpenseParticipants(
        uint256 _expenseId
    ) public view returns (address[] memory) {
        // Ensure the expense ID is valid (less than the current count)
        require(_expenseId < expenseCount, "Expense ID out of bounds");
        return expenses[_expenseId].participants;
    }

    /**
     * @dev Get basic information (ID, label, timestamp) about an expense.
     * @param _expenseId ID of the expense.
     * @return id The expense ID.
     * @return label The expense description.
     * @return timestamp When the expense was created (Unix timestamp).
     */
    function getExpenseBasicInfo(
        uint256 _expenseId
    ) public view returns (uint256 id, string memory label, uint256 timestamp) {
        require(_expenseId < expenseCount, "Expense ID out of bounds");
        Expense storage expense = expenses[_expenseId];
        return (expense.id, expense.label, expense.timestamp);
    }

    /**
     * @dev Get the amount (in wei) a specific participant paid for a specific expense.
     * @param _expenseId ID of the expense.
     * @param _participant Address of the participant.
     * @return Amount paid by the participant (in wei).
     */
    function getAmountPaid(
        uint256 _expenseId,
        address _participant
    ) public view returns (uint256) {
        require(_expenseId < expenseCount, "Expense ID out of bounds");
        // Returns 0 if the participant wasn't involved or didn't pay
        return expenses[_expenseId].amountPaid[_participant];
    }

    /**
     * @dev Get the amount (in wei) a specific participant owes for a specific expense.
     * @param _expenseId ID of the expense.
     * @param _participant Address of the participant.
     * @return Amount owed by the participant (in wei).
     */
    function getAmountOwed(
        uint256 _expenseId,
        address _participant
    ) public view returns (uint256) {
        require(_expenseId < expenseCount, "Expense ID out of bounds");
        // Returns 0 if the participant wasn't involved or didn't owe
        return expenses[_expenseId].amountOwed[_participant];
    }

    /**
     * @dev Calculate the net balance (in wei) for a person across all recorded expenses.
     * Positive balance means they are owed money overall.
     * Negative balance means they owe money overall.
     * @param _person Address of the person.
     * @return netBalance The calculated net balance (can be negative).
     */
    function getNetBalance(address _person) public view returns (int256) {
        int256 netBalance = 0;

        // Iterate through all expenses recorded so far
        for (uint256 i = 0; i < expenseCount; i++) {
            // Add amount paid by the person (increases their balance)
            netBalance += int256(expenses[i].amountPaid[_person]);
            // Subtract amount owed by the person (decreases their balance)
            netBalance -= int256(expenses[i].amountOwed[_person]);
        }

        return netBalance;
    }

    /**
     * @dev Allows a user (msg.sender) to send ETH to another registered user (_to)
     * to settle a debt. The amount sent is determined by the transaction's value (msg.value).
     * This function primarily emits an event; the ETH transfer is implicit.
     * @param _to Address of the person to pay.
     */
    function settleDebt(address _to) public payable {
        require(_to != address(0), "Cannot settle debt with the zero address");
        require(_to != msg.sender, "Cannot settle debt with yourself");
        // Optional: Check if recipient is registered
        // require(people[_to].isRegistered, "Recipient is not registered");
        require(msg.value > 0, "Settlement amount must be greater than zero");

        // Emit an event recording the settlement amount (which is msg.value)
        emit DebtSettled(msg.sender, _to, msg.value);
    }

    /**
     * @dev Get a list of all registered users' addresses.
     * @return Array of all registered wallet addresses.
     */
    function getAllRegisteredPeople() public view returns (address[] memory) {
        return registeredPeople;
    }


    // --- NEWLY ADDED FEATURES ---

    /**
     * @dev Get the registered name of the calling user (msg.sender).
     * @return The user's name.
     */
    function getMyName() public view returns (string memory) {
        require(people[msg.sender].isRegistered, "Caller is not registered");
        return people[msg.sender].name;
    }

    /**
     * @dev Check if a given address is registered in the system.
     * @param _addr The address to check.
     * @return True if the address is registered, false otherwise.
     */
    function isPersonRegistered(address _addr) public view returns (bool) {
        // Directly check the registration flag for the given address
        return people[_addr].isRegistered;
    }

    /**
     * @dev Get the total number of registered people.
     * @return The count of registered users.
     */
    function getTotalRegisteredPeople() public view returns (uint256) {
        // Return the current length of the registered people tracking array
        return registeredPeople.length;
    }

    /**
     * @dev Get the label (description) of the most recently added expense.
     * @return The label of the last expense. Reverts if no expenses exist.
     */
    function getLastExpenseLabel() public view returns (string memory) {
        require(expenseCount > 0, "No expenses have been added yet");
        // Access the expense using the ID before the current expenseCount
        return expenses[expenseCount - 1].label;
    }

    /**
     * @dev Allows the calling user (msg.sender) to update their registered name.
     * @param _newName The new name for the user.
     */
    function updateMyName(string memory _newName) public {
        require(people[msg.sender].isRegistered, "Caller is not registered");
        require(bytes(_newName).length > 0, "New name cannot be empty");
        // Optional: Check if the new name is different from the old one
        // require(keccak256(bytes(people[msg.sender].name)) != keccak256(bytes(_newName)), "New name is the same as the old name");

        // Update the name in the storage
        people[msg.sender].name = _newName;

        // Emit event to notify off-chain applications
        emit PersonNameUpdated(msg.sender, _newName);
    }
}
