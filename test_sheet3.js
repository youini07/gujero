const { google } = require('googleapis');
const auth = new google.auth.GoogleAuth({ keyFile: 'server/service_account.json', scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'] });
const sheets = google.sheets({ version: 'v4', auth });
sheets.spreadsheets.get({ spreadsheetId: '1slDF5PfnKUwIrhSlbK5h_Px1_8D6LpnT8FFXCYNmp98' }).then(res => console.log(res.data.properties.title)).catch(console.error);
