const fs = require('fs');
const { imapConfig, mailbox } = require('./config'); // assuming you have a separate config file

const Imap = require('imap');
const simpleParser = require('mailparser').simpleParser;

const path = require('path');

const savedEmailIdsFile = 'has_save_mails_id.txt';

function saveEmailId(id) {
    if (!id) return;
    fs.appendFileSync(savedEmailIdsFile, id + '\n');
}

function isEmailIdSaved(id) {
  if (!fs.existsSync(savedEmailIdsFile)) {
      fs.writeFileSync(savedEmailIdsFile, ''); // Create the file if it doesn't exist
      return false;
  }

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

function fetchUnseenEmails() {
    openInbox((err, box) => {
        if (err) throw err;
        imap.search(['UNSEEN'], (err, results) => {
            if (err) throw err;
            const f = imap.fetch(results, { bodies: '' });
            f.on('message', (msg, seqno) => {
                msg.on('body', (stream, info) => {
                    simpleParser(stream, async (err, parsed) => {
                        if (err) throw err;
                        const emailId = parsed.messageId;
                        if (!isEmailIdSaved(emailId)) {
                            saveEmailContent(parsed.text);
                            saveEmailId(emailId);
                        }
                    });
                });
            });
            f.once('end', () => {
                console.log('No more emails to fetch');
            });
        });
    });
}

imap.once('ready', () => {
    // Initial fetch
    fetchUnseenEmails();

    // Fetch unseen emails every 10 second
    setInterval(fetchUnseenEmails, 10 * 1000);
});

imap.once('error', (err) => {
    console.error(err);
});

imap.once('end', () => {
    console.log('IMAP connection ended');
});

imap.connect();