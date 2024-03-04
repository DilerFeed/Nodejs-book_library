const express = require('express');
const { MongoClient, ObjectId } = require('mongodb');
const app = express();
const port = 3000;

const url = ''; // URL for connecting to MongoDB
const dbName = 'bookstore'; // Database name
const collectionName = 'books'; // Collection name

// Class for "Book" objects
class Book {
    constructor(numericId, title, author, genre, publisher, pageCount) {
        this.numericId = numericId;
        this.title = title;
        this.author = author;
        this.genre = genre;
        this.publisher = publisher;
        this.pageCount = pageCount;
    }
}

// Connecting to MongoDB
async function startServer() {
    try {
        const client = await MongoClient.connect(url, { useUnifiedTopology: true });
        console.log('Connected to MongoDB');

        const db = client.db(dbName);
        const collection = db.collection(collectionName);

        app.use(express.static('public'));  // Added middleware for static resource (CSS)

        // Main route to display the page with a table
        app.get('/', async (req, res) => {
            try {
                // Get the latest 5 objects and display them in a table
                const recentBooks = await collection.find().sort({ _id: -1 }).limit(5).toArray();

                // Display the page with the table
                res.send(`
                    <html>
                        <head>
                            <title>List of Books</title>
                            <link rel="stylesheet" type="text/css" href="/styles.css">
                        </head>
                        <body>
                            <h1>List of Books</h1>
                            <table>
                                <tr>
                                    <th>Title</th>
                                    <th>Author</th>
                                    <th>Genre</th>
                                    <th>Details</th>
                                    <th>Delete</th>
                                </tr>
                                ${recentBooks.reverse().map((book, index) => `
                                    <tr>
                                        <td>${book.title}</td>
                                        <td>${book.author}</td>
                                        <td>${book.genre}</td>
                                        <td><a class="button" href="/object/${index + 1}">Details</a></td>
                                        <td><a class="button" href="/delete/${index + 1}">Delete</a></td>
                                    </tr>
                                `).join('')}
                            </table>
                            <a class="button" href="/add">Add a Book</a>
                        </body>
                    </html>
                `);
            } catch (error) {
                console.error('Error getting objects from the database:', error);
                res.status(500).send('Server Error');
            }
        });

        // Main route for adding a new object
        app.get('/add', (req, res) => {
            res.send(`
                <html>
                    <head>
                        <title>Add a New Book</title>
                        <link rel="stylesheet" type="text/css" href="/styles.css">
                    </head>
                    <body>
                        <h1>Add a New Book</h1>
                        <form method="post" action="/add">
                            <label for="title">Title:</label>
                            <input type="text" id="title" name="title" required><br>

                            <label for="author">Author:</label>
                            <input type="text" id="author" name="author" required><br>

                            <label for="genre">Genre:</label>
                            <input type="text" id="genre" name="genre" required><br>

                            <label for="publisher">Publisher:</label>
                            <input type="text" id="publisher" name="publisher" required><br>

                            <label for="pageCount">Page Count:</label>
                            <input type="number" id="pageCount" name="pageCount" required><br>

                            <button class="button" type="submit">Add Book</button>
                        </form>
                    </body>
                </html>
            `);
        });

        async function getNextNumericId() {
            const lastBook = await collection.find().sort({ numericId: -1 }).limit(1).toArray();
            const lastNumericId = lastBook.length > 0 ? lastBook[0].numericId : 0;
            return lastNumericId + 1;
        }

        // Handling POST request to add a new object
        app.post('/add', express.urlencoded({ extended: true }), async (req, res) => {
            const { title, author, genre, publisher, pageCount } = req.body;
            const numericId = await getNextNumericId(); // Get a new numeric id

            // Add a new object to the database
            try {
                const result = await collection.insertOne(new Book(parseInt(numericId), title, author, genre, publisher, parseInt(pageCount)));
                console.log('Added a new object with ID:', numericId);
                res.redirect('/');
            } catch (error) {
                console.error('Error adding object to the database:', error);
                res.status(500).send('Server Error');
            }
        });

        // Class method to display detailed information about an object
        app.get('/object/:numericId', async (req, res) => {
            try {
                const numericId = parseInt(req.params.numericId);
                const selectedBook = await collection.findOne({ numericId });
        
                if (selectedBook) {
                    res.send(`
                        <html>
                            <head>
                                <title>Detailed Information</title>
                                <link rel="stylesheet" type="text/css" href="/styles.css">
                            </head>
                            <body>
                                <h1>Detailed Information</h1>
                                <p>Title: ${selectedBook.title}</p>
                                <p>Author: ${selectedBook.author}</p>
                                <p>Genre: ${selectedBook.genre}</p>
                                <p>Publisher: ${selectedBook.publisher}</p>
                                <p>Page Count: ${selectedBook.pageCount}</p>
                                <a class="button" href="/">Back to Main Page</a>
                            </body>
                        </html>
                    `);
                } else {
                    res.status(404).send('Object Not Found');
                }
            } catch (error) {
                console.error('Error getting object from the database:', error);
                res.status(500).send('Server Error');
            }
        });
        
        // Class method to delete an object
        app.get('/delete/:numericId', async (req, res) => {
            try {
                const numericId = parseInt(req.params.numericId);
                const deletedBook = await collection.findOneAndDelete({ numericId });
        
                if (deletedBook) {
                    res.redirect('/');
                } else {
                    res.status(404).send('Object Not Found');
                }
            } catch (error) {
                console.error('Error deleting object from the database:', error);
                res.status(500).send('Server Error');
            }
        });

        app.listen(port, () => {
            console.log(`Server is running at http://localhost:${port}`);
        });
    } catch (error) {
        console.error('Error connecting to MongoDB:', error);
    }
}

startServer();