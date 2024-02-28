const fs = require('fs');
const { imapConfig, mailbox } = require('./config'); // assuming you have a separate config file

const Imap = require('imap');
const simpleParser = require('mailparser').simpleParser;

const path = require('path');

function saveEmailContent(content) {
    const folder = 'emails';
    const filename = `email_${new Date().getTime()}.txt`;
    const filePath = path.join(folder, filename);

    fs.mkdir(folder, { recursive: true }, (err) => {
        if (err) throw err;

        fs.writeFile(filePath, content, (err) => {
            if (err) throw err;
            console.log(`Email content saved to ${filePath}`);
        });
    });
}

// Connect to the IMAP server and retrieve emails
const imap = new Imap(imapConfig);

function openInbox(cb) {
    imap.openBox(mailbox, true, cb);
}

imap.once('ready', () => {
    openInbox((err, box) => {
        if (err) throw err;
        imap.search(['UNSEEN'], (err, results) => {
            if (err) throw err;
            const f = imap.fetch(results, { bodies: '' });
            f.on('message', (msg, seqno) => {
                msg.on('body', (stream, info) => {
                    simpleParser(stream, async (err, parsed) => {
                        if (err) throw err;
                        const content = `
                            From: ${parsed.from.text}\n
                            Subject: ${parsed.subject}\n
                            Date: ${parsed.date}\n\n
                            Body:\n${parsed.text}`;
                        saveEmailContent(content);
                    });
                });
            });
            f.once('end', () => {
                console.log('No more emails to fetch');
                imap.end();
            });
        });
    });
});

imap.once('error', (err) => {
    console.error(err);
});

imap.once('end', () => {
    console.log('IMAP connection ended');
});

imap.connect();