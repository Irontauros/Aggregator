const bcrypt = require('bcrypt');
const prompt = require('prompt-sync')();

// Ask for the password
const password = prompt('Enter the password: ');

// Hash the password
bcrypt.hash(password, 10, (err, hashedPassword) => {
    if (err) {
        console.error('Error hashing password:', err);
    } else {
        console.log('Hashed Password:', hashedPassword);
        // You can copy this hashed password into your server.js file
    }
});
