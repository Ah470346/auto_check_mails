module.exports = {
  imapConfig: {
      user: 'buixuankien199@gmail.com', // Your email address
      password: 'wspi onsb ccow fbqg', // Your email password
      host: 'imap.gmail.com', // Gmail IMAP server hostname
      port: 993, // IMAP port (usually 993 for SSL/TLS)
      tls: true, // Enable TLS/SSL
      tlsOptions: {
        rejectUnauthorized: false // Accept self-signed certificates
      }
  },
  mailbox: 'INBOX' // The mailbox/folder you want to check for new emails
};