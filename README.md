# Expense-tracker-dApp

A decentralized expense management dApp built on blockchain. This application allows users to track shared expanses transparently on the Ethereum blockchain.
## Features
1. User registration with Crypto wallet
2. View real-time net balances for all users
3. Add and split expenses among registered users
4. Data stored securely on blockchain, decentralized

## Tech Stack
1. Frontend: React, js, CSS
2. Blockchain: Ethereum

The significant changes made by me:
1. New state variables
  const [totalUsers, setTotalUsers] = useState(0);
  const [lastExpenseLabel, setLastExpenseLabel] = useState('');
  const [newName, setNewName] = useState('');
  const [showUpdateName, setShowUpdateName] = useState(false);
2. Fetch total user
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
3. Fetch previous expense
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
4. Update name
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


