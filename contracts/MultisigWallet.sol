// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

/**
 * @title MultisigWallet
 * @dev Implements a k-of-n multisig wallet with support for arbitrary contract calls
 */
contract MultisigWallet {
    event SubmitTransaction(
        address indexed owner,
        uint256 indexed txIndex,
        address indexed to,
        uint256 value,
        bytes data
    );
    event ConfirmTransaction(address indexed owner, uint256 indexed txIndex);
    event RevokeConfirmation(address indexed owner, uint256 indexed txIndex);
    event ExecuteTransaction(address indexed owner, uint256 indexed txIndex);
    event SignerSetUpdateSubmitted(uint256 indexed updateIndex, address[] newSigners, uint256 newThreshold);
    event SignerSetUpdateConfirmed(address indexed signer, uint256 indexed updateIndex);
    event SignerSetUpdateExecuted(uint256 indexed updateIndex);

    struct Transaction {
        address to;
        uint256 value;
        bytes data;
        bool executed;
        uint256 numConfirmations;
    }

    struct SignerUpdate {
        address[] newSigners;
        uint256 newThreshold;
        bool executed;
        uint256 numConfirmations;
    }

    address[] public signers;
    mapping(address => bool) public isSigner;
    uint256 public threshold;

    // Transaction storage
    Transaction[] public transactions;
    mapping(uint256 => mapping(address => bool)) public isConfirmed;

    // Signer update storage
    SignerUpdate[] public signerUpdates;
    mapping(uint256 => mapping(address => bool)) public isSignerUpdateConfirmed;

    modifier onlySigner() {
        require(isSigner[msg.sender], "not signer");
        _;
    }

    modifier txExists(uint256 _txIndex) {
        require(_txIndex < transactions.length, "tx does not exist");
        _;
    }

    modifier notExecuted(uint256 _txIndex) {
        require(!transactions[_txIndex].executed, "tx already executed");
        _;
    }

    modifier notConfirmed(uint256 _txIndex) {
        require(!isConfirmed[_txIndex][msg.sender], "tx already confirmed");
        _;
    }

    constructor(address[] memory _signers, uint256 _threshold) {
        require(_signers.length > 0, "signers required");
        require(
            _threshold > 0 && _threshold <= _signers.length,
            "invalid threshold"
        );

        for (uint256 i = 0; i < _signers.length; i++) {
            address signer = _signers[i];
            require(signer != address(0), "invalid signer");
            require(!isSigner[signer], "signer not unique");

            isSigner[signer] = true;
            signers.push(signer);
        }

        threshold = _threshold;
    }

    receive() external payable {}

    function submitTransaction(
        address _to,
        uint256 _value,
        bytes memory _data
    ) public onlySigner {
        uint256 txIndex = transactions.length;

        transactions.push(
            Transaction({
                to: _to,
                value: _value,
                data: _data,
                executed: false,
                numConfirmations: 0
            })
        );

        emit SubmitTransaction(msg.sender, txIndex, _to, _value, _data);
    }

    function confirmTransaction(uint256 _txIndex)
        public
        onlySigner
        txExists(_txIndex)
        notExecuted(_txIndex)
        notConfirmed(_txIndex)
    {
        Transaction storage transaction = transactions[_txIndex];
        transaction.numConfirmations += 1;
        isConfirmed[_txIndex][msg.sender] = true;

        emit ConfirmTransaction(msg.sender, _txIndex);
    }

    function executeTransaction(uint256 _txIndex)
        public
        onlySigner
        txExists(_txIndex)
        notExecuted(_txIndex)
    {
        Transaction storage transaction = transactions[_txIndex];

        require(
            transaction.numConfirmations >= threshold,
            "insufficient confirmations"
        );

        transaction.executed = true;

        (bool success, ) = transaction.to.call{value: transaction.value}(
            transaction.data
        );
        require(success, "tx failed");

        emit ExecuteTransaction(msg.sender, _txIndex);
    }

    function submitSignerUpdate(address[] memory _newSigners, uint256 _newThreshold)
        public
        onlySigner
    {
        require(_newSigners.length > 0, "signers required");
        require(
            _newThreshold > 0 && _newThreshold <= _newSigners.length,
            "invalid threshold"
        );

        uint256 updateIndex = signerUpdates.length;

        signerUpdates.push(
            SignerUpdate({
                newSigners: _newSigners,
                newThreshold: _newThreshold,
                executed: false,
                numConfirmations: 0
            })
        );

        emit SignerSetUpdateSubmitted(updateIndex, _newSigners, _newThreshold);
    }

    function confirmSignerUpdate(uint256 _updateIndex)
        public
        onlySigner
    {
        require(_updateIndex < signerUpdates.length, "update does not exist");
        require(!signerUpdates[_updateIndex].executed, "update already executed");
        require(!isSignerUpdateConfirmed[_updateIndex][msg.sender], "already confirmed");

        SignerUpdate storage update = signerUpdates[_updateIndex];
        update.numConfirmations += 1;
        isSignerUpdateConfirmed[_updateIndex][msg.sender] = true;

        emit SignerSetUpdateConfirmed(msg.sender, _updateIndex);
    }

    function executeSignerUpdate(uint256 _updateIndex)
        public
        onlySigner
    {
        require(_updateIndex < signerUpdates.length, "update does not exist");

        SignerUpdate storage update = signerUpdates[_updateIndex];
        require(!update.executed, "update already executed");
        require(
            update.numConfirmations >= threshold,
            "insufficient confirmations"
        );

        update.executed = true;

        // Reset current signers
        for (uint256 i = 0; i < signers.length; i++) {
            isSigner[signers[i]] = false;
        }

        // Update to new signer set
        delete signers;
        for (uint256 i = 0; i < update.newSigners.length; i++) {
            address signer = update.newSigners[i];
            require(signer != address(0), "invalid signer");
            require(!isSigner[signer], "signer not unique");

            isSigner[signer] = true;
            signers.push(signer);
        }

        threshold = update.newThreshold;

        emit SignerSetUpdateExecuted(_updateIndex);
    }

    // View functions
    function getSigners() public view returns (address[] memory) {
        return signers;
    }

    function getTransactionCount() public view returns (uint256) {
        return transactions.length;
    }

    function getTransaction(uint256 _txIndex)
        public
        view
        returns (
            address to,
            uint256 value,
            bytes memory data,
            bool executed,
            uint256 numConfirmations
        )
    {
        Transaction storage transaction = transactions[_txIndex];

        return (
            transaction.to,
            transaction.value,
            transaction.data,
            transaction.executed,
            transaction.numConfirmations
        );
    }
}