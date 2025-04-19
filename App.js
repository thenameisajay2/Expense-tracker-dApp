// Fixed App.js
import React, { useState, useEffect } from 'react';
import { ethers } from 'ethers';
import './App.css';
import ExpenseTrackerABI from './ExpenseTrackerABI.json';

function App() {
  const [provider, setProvider] = useState(null);
  const [contract, setContract] = useState(null);
  const [account, setAccount] = useState('');
  const [isConnected, setIsConnected] = useState(false);
  const [isRegistered, setIsRegistered] = useState(false);
  const [name, setName] = useState('');
  const [expenses, setExpenses] = useState([]);
  const [people, setPeople] = useState([]);
  const [loadingExpenses, setLoadingExpenses] = useState(false);
  const [expenseLabel, setExpenseLabel] = useState('');
  const [participants, setParticipants] = useState([{ address: '', amountPaid: 0, amountOwed: 0 }]);
  const [showAddExpense, setShowAddExpense] = useState(false);
  const contractAddress = "0xda5bd594d98ae21f262c5ec45f34ab2678b71e44";
  const [totalUsers, setTotalUsers] = useState(0);
  const [lastExpenseLabel, setLastExpenseLabel] = useState('');
  const [newName, setNewName] = useState('');
  const [showUpdateName, setShowUpdateName] = useState(false);

  useEffect(() => {
    const init = async () => {
      if (!window.ethereum) {
        alert("Please install MetaMask.");
        return;
      }
      const provider = new ethers.providers.Web3Provider(window.ethereum);
      setProvider(provider);

      const accounts = await provider.send("eth_requestAccounts", []);
      setAccount(accounts[0]);
      setIsConnected(true);

      const signer = provider.getSigner();
      const contract = new ethers.Contract(contractAddress, ExpenseTrackerABI, signer);
      setContract(contract);
    };
    init();
  }, []);

  useEffect(() => {
    const checkAndLoadData = async () => {
      if (!contract || !account) return;
      try {
        const [_name, _address, _isRegistered] = await contract.getPerson(account);
        setIsRegistered(_isRegistered);
        if (_isRegistered) {
          setName(_name);
          await fetchTotalUsers();
          await fetchLastExpenseLabel();
          await loadExpenses();
          await loadPeople();
        } else {
          setName('');
          setTotalUsers(0);
          setLastExpenseLabel('');
          setExpenses([]);
          setPeople([]);
        }
      } catch (error) {
        console.error("Error checking registration or loading data:", error);
        setIsRegistered(false);
        setName('');
        setTotalUsers(0);
        setLastExpenseLabel('');
      }
    };
    checkAndLoadData();
  }, [contract, account]);

  const registerPerson = async () => {
    if (!name.trim()) {
      alert("Please enter your name.");
      return;
    }
    try {
      const tx = await contract.registerPerson(name.trim());
      await tx.wait();
      setIsRegistered(true);
      alert("Registration successful!");
      await loadPeople();
      await fetchTotalUsers();
      await loadExpenses();
    } catch (error) {
      console.error("Registration failed:", error);
      alert(`Registration failed: ${error.message || error}`);
    }
  };

  const addExpense = async () => {
    try {
      const addresses = participants.map(p => p.address);
      const paidAmounts = participants.map(p => ethers.utils.parseEther(p.amountPaid.toString()));
      const owedAmounts = participants.map(p => ethers.utils.parseEther(p.amountOwed.toString()));

      const tx = await contract.addExpense(expenseLabel, addresses, paidAmounts, owedAmounts);
      await tx.wait();

      setExpenseLabel('');
      setParticipants([{ address: '', amountPaid: 0, amountOwed: 0 }]);
      setShowAddExpense(false);
      await loadExpenses();
      await loadPeople();
      await fetchLastExpenseLabel();
    } catch (error) {
      console.error("Error adding expense:", error);
      alert(`Error: ${error.message || error}`);
    }
  };

  const loadExpenses = async () => {
    if (!contract) return;
    try {
      setLoadingExpenses(true);
      const count = await contract.expenseCount();
      const allExpenses = [];
      for (let i = 0; i < count; i++) {
        const [label, timestamp, participants, paid, owed] = await contract.getExpense(i);
        const participantData = participants.map((addr, idx) => ({
          address: addr,
          amountPaid: ethers.utils.formatEther(paid[idx]),
          amountOwed: ethers.utils.formatEther(owed[idx])
        }));
        allExpenses.push({ id: i, label, timestamp: new Date(Number(timestamp) * 1000).toLocaleString(), participants: participantData });
      }
      setExpenses(allExpenses);
    } catch (err) {
      console.error("Failed to load expenses:", err);
    } finally {
      setLoadingExpenses(false);
    }
  };

  const loadPeople = async () => {
    if (!contract) return;
    try {
      const peopleData = await contract.getAllPeople();
      const formatted = peopleData.map(p => ({
        name: p.name,
        address: p.walletAddress,
        netBalance: "-" // netBalance requires extra call
      }));
      for (let i = 0; i < formatted.length; i++) {
        const net = await contract.getNetBalance(formatted[i].address);
        formatted[i].netBalance = ethers.utils.formatEther(net);
      }
      setPeople(formatted);
    } catch (err) {
      console.error("Failed to load people:", err);
    }
  };

  const fetchTotalUsers = async () => {
    if (!contract) return;
    try {
      const count = await contract.getTotalRegisteredPeople();
      setTotalUsers(count.toNumber());
    } catch (error) {
      console.error("Error fetching total users:", error);
      setTotalUsers(0);
    }
  };

  const fetchLastExpenseLabel = async () => {
    if (!contract) return;
    try {
      const expenseCount = await contract.expenseCount();
      if (expenseCount.toNumber() > 0) {
        const label = await contract.getLastExpenseLabel();
        setLastExpenseLabel(label);
      } else {
        setLastExpenseLabel("N/A - No expenses yet");
      }
    } catch (error) {
      console.error("Error fetching last expense label:", error);
      setLastExpenseLabel("Error fetching label");
    }
  };

  const updateName = async () => {
    if (!newName.trim()) {
      alert("Please enter a new name.");
      return;
    }
    try {
      const tx = await contract.updateMyName(newName.trim());
      await tx.wait();
      setName(newName.trim());
      setNewName('');
      setShowUpdateName(false);
      alert("Name updated successfully!");
      await loadPeople();
    } catch (error) {
      console.error("Error updating name:", error);
      alert(`Error updating name: ${error.message || error}`);
    }
  };

  const addParticipant = () => {
    setParticipants([...participants, { address: '', amountPaid: 0, amountOwed: 0 }]);
  };

  const updateParticipant = (index, field, value) => {
    const updated = [...participants];
    updated[index][field] = field === 'address' ? value : parseFloat(value);
    setParticipants(updated);
  };

  const removeParticipant = (index) => {
    const updated = participants.filter((_, i) => i !== index);
    setParticipants(updated);
  };

  return (
    <div className="App">
      <header className="App-header">
        <h1>On-Chain Expense Tracker</h1>

        {!isConnected ? (
          <button onClick={() => window.ethereum.request({ method: 'eth_requestAccounts' })}>
            Connect Wallet
          </button>
        ) : !isRegistered ? (
          <div className="registration-form">
            <h2>Register</h2>
            <input
              type="text"
              placeholder="Your Name"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
            <button onClick={registerPerson}>Register</button>
          </div>
        ) : (
          <div className="expense-tracker">
            <div className="welcome-section">
              <h2>Welcome, {name}</h2>
              <p className="user-info">Account: {account}</p>
              <p className="user-info">Total Registered Users: {totalUsers}</p>
              <p className="user-info">Last Expense Added: {lastExpenseLabel || 'N/A'}</p>
              <p className="user-info">Registration Status: {isRegistered ? "Registered" : "Not Registered"}</p>
            </div>

            <div className="actions">
              <button onClick={() => setShowAddExpense(!showAddExpense)}>
                {showAddExpense ? "Cancel Add Expense" : "Add Expense"}
              </button>
              <button onClick={() => setShowUpdateName(!showUpdateName)}>
                {showUpdateName ? "Cancel Update Name" : "Update My Name"}
              </button>
              <button onClick={loadExpenses}>Refresh Expenses</button>
              <button onClick={fetchTotalUsers}>Refresh User Count</button>
              <button onClick={fetchLastExpenseLabel}>Refresh Last Expense</button>
            </div>

            {showUpdateName && (
              <div className="add-expense-form">
                <h3>Update Your Name</h3>
                <input
                  type="text"
                  placeholder="New Name"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                />
                <button onClick={updateName}>Save New Name</button>
              </div>
            )}

            {showAddExpense && (
              <div className="add-expense-form">
                <h3>New Expense</h3>
                <input
                  type="text"
                  placeholder="Expense Label"
                  value={expenseLabel}
                  onChange={(e) => setExpenseLabel(e.target.value)}
                />
                {participants.map((p, idx) => (
                  <div key={idx} className="participant-row">
                    <input
                      placeholder="Address"
                      value={p.address}
                      onChange={(e) => updateParticipant(idx, 'address', e.target.value)}
                    />
                    <input
                      type="number"
                      placeholder="Paid"
                      value={p.amountPaid}
                      onChange={(e) => updateParticipant(idx, 'amountPaid', e.target.value)}
                    />
                    <input
                      type="number"
                      placeholder="Owed"
                      value={p.amountOwed}
                      onChange={(e) => updateParticipant(idx, 'amountOwed', e.target.value)}
                    />
                    <button onClick={() => removeParticipant(idx)}>Remove</button>
                  </div>
                ))}
                <button onClick={addParticipant}>Add Participant</button>
                <button onClick={addExpense}>Save Expense</button>
              </div>
            )}

            <h3>People</h3>
            <table>
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Address</th>
                  <th>Net Balance</th>
                </tr>
              </thead>
              <tbody>
                {people.map((person, idx) => (
                  <tr key={idx}>
                    <td data-label="Name">{person.name}</td>
                    <td data-label="Address">{person.address.substring(0, 8)}...</td>
                    <td data-label="Net Balance" style={{ color: parseFloat(person.netBalance) < 0 ? 'var(--danger)' : 'var(--success)' }}>
                      {parseFloat(person.netBalance).toFixed(5)} ETH
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            <h3>Expense History</h3>
            {loadingExpenses ? <p>Loading...</p> : (
              expenses.map(expense => (
                <div key={expense.id} style={{ border: '1px solid #ddd', margin: '10px 0', padding: '10px' }}>
                  <h4>{expense.label}</h4>
                  <p>{expense.timestamp}</p>
                  <table style={{ borderCollapse: 'collapse', width: '100%' }}>
                    <thead>
                      <tr>
                        <th>Participant</th>
                        <th>Paid</th>
                        <th>Owes</th>
                      </tr>
                    </thead>
                    <tbody>
                      {expense.participants.map((p, idx) => (
                        <tr key={idx}>
                          <td data-label="Participant">
                            {people.find(person => person.address === p.address)?.name || p.address.substring(0, 8)}...
                          </td>
                          <td data-label="Paid">{p.amountPaid} ETH</td>
                          <td data-label="Owes">{p.amountOwed} ETH</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ))
            )}
          </div>
        )}
      </header>
    </div>
  );
}

export default App;

