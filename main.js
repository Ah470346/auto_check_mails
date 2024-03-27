const fs = require('fs');
const imapConfig = require('./config'); // assuming you have a separate config file

const Imap = require('imap');
const simpleParser = require('mailparser').simpleParser;

const path = require('path');

const savedEmailIdsFile = 'has_save_mails_id.txt';
const folder = 'emails';
const filename = 'email_content.txt';
const filePath = path.join(folder, filename);
const BANK_EMAIL = 'mailalert@acb.com.vn'
const mailbox = 'INBOX' // The mailbox/folder you want to check for new emails

function createFile () {
    // create file has_save_mails_id.txt
    if (!fs.existsSync(savedEmailIdsFile)) {
        fs.writeFileSync(savedEmailIdsFile, ''); // Create the file if it doesn't exist
    }

    /* create file emails/email_content.txt just apply for save to the same file */
    // if (!fs.existsSync(filePath)) {
    //     fs.mkdir(folder, { recursive: true }, (err) => {
    //         if (err) throw err;
    //         fs.writeFileSync(filePath, '');
    //     });
    // }
}

function saveEmailId(id) {
    if (!id) return;
    fs.appendFileSync(savedEmailIdsFile, id + '\n');
}

function isEmailIdSaved(id) {
    if (!fs.existsSync(savedEmailIdsFile)) return false;

    let savedIds = [];
    try {
        savedIds = fs.readFileSync(savedEmailIdsFile, 'utf8').split('\n');
    } catch (error) {
        if (error.code !== 'ENOENT') {
            throw error;
        }
    }
    return savedIds.includes(id);
}

function isEmailTransfer(email) {
    return email === BANK_EMAIL;
}

/* save each email 1 file */
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

/* save to the same file */
// function saveEmailContent(content) {
//     fs.mkdir(folder, { recursive: true }, (err) => {
//             if (err) throw err;
//             fs.appendFileSync(filePath, content + '\n');
//     });
// }

function formatEmailContent(content) {
    if (!content) return;
    const moneyFind = content.split('Credit');
    const money = moneyFind[1].split(' VND.')[0];

    const accountFind = content.split('NAP ');
    const account = accountFind[1].split('.')[0];

    // clear account space
    return account.split(' ')[0] + money;
}
// Connect to the IMAP server and retrieve emails
const imap = new Imap(imapConfig);

function openInbox(cb) {
    imap.openBox(mailbox, false, cb);
}

function fetchUnseenEmails() {
    openInbox((err, box) => {
        if (err) throw err;
        imap.search(['UNSEEN'], (err, results) => {
            if (err) throw error;
            try {
                const f = imap.fetch(results, { bodies: '', markSeen: true });
                f.on('message', (msg, seqno) => {
                    msg.on('body', (stream, info) => {
                        simpleParser(stream, async (err, parsed) => {
                            if (err) throw err;
                            const emailId = parsed.messageId;
                            const emailAddress = parsed.from.text;
                            if (!emailId || !emailAddress) return;
                            if (!isEmailIdSaved(emailId) && isEmailTransfer(emailAddress)) {
                                const content = formatEmailContent(parsed.text)
                                saveEmailContent(content);
                                saveEmailId(emailId);
                            }
                        });
                    });
                });
                f.once('end', () => {
                    console.log('No more emails to fetch');
                });
            } catch (error) {
                if (error.message === 'Nothing to fetch') {
                    console.log(error.message);
                } else {
                    throw error;
                }
            }
        });
    });
}

imap.once('ready', () => {
    // Initial fetch
    // fetchUnseenEmails();
    createFile ();

    // Fetch unseen emails every 10 second
    setInterval(fetchUnseenEmails, 10 * 1000); // test
});

imap.once('error', (err) => {
    console.error(err);
});

imap.once('end', () => {
    console.log('IMAP connection ended');
});

imap.connect();