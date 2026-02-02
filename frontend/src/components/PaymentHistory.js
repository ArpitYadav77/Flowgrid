import React from 'react';
import * as Icons from './Icons';
import { useNotification } from '../context/NotificationContext';

const PaymentHistory = ({ payments = [] }) => {
  const { showNotification } = useNotification();

  const formatDate = (dateStr) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric', 
      year: 'numeric' 
    });
  };

  const formatAmount = (amount) => {
    return `₹${amount.toFixed(2)}`;
  };

  const handleExport = () => {
    showNotification('Exporting payment history...', 'info');
  };

  return (
    <div className="card card-large">
      <div className="card-header">
        <div className="card-title-group">
          <h2 className="card-title">Payment History</h2>
          <span className="card-subtitle">Recent transactions</span>
        </div>
        <div className="card-actions">
          <button className="btn btn-secondary" onClick={handleExport}>
            <Icons.Download />
            Export
          </button>
        </div>
      </div>
      <div className="card-body">
        <div className="table-container">
          <table className="data-table">
            <thead>
              <tr>
                <th>Transaction ID</th>
                <th>Customer</th>
                <th>Service</th>
                <th>Date</th>
                <th>Amount</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {payments.map((payment) => (
                <tr key={payment.id}>
                  <td>
                    <span className="transaction-id">#{payment.id}</span>
                  </td>
                  <td>
                    <div className="customer-info">
                      <div className="customer-avatar">
                        {payment.customerInitials}
                      </div>
                      <span>{payment.customerName}</span>
                    </div>
                  </td>
                  <td>{payment.service}</td>
                  <td>{formatDate(payment.date)}</td>
                  <td>
                    <span className="amount">{formatAmount(payment.amount)}</span>
                  </td>
                  <td>
                    <span className={`status-badge ${payment.status}`}>
                      {payment.status.charAt(0).toUpperCase() + payment.status.slice(1)}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default PaymentHistory;
