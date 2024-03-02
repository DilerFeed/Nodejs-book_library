const express = require('express');
const { MongoClient, ObjectId } = require('mongodb');
const app = express();
const port = 3000;

const url = ''; // URL для підключення до MongoDB
const dbName = 'bookstore'; // Назва бази даних
const collectionName = 'books'; // Назва колекції

// Клас об'єктів "Книга"
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

// Підключення до MongoDB
async function startServer() {
    try {
        const client = await MongoClient.connect(url, { useUnifiedTopology: true });
        console.log('Підключено до MongoDB');

        const db = client.db(dbName);
        const collection = db.collection(collectionName);

        app.use(express.static('public'));  // Додано middleware для статичного ресурсу (CSS)

        // Головний маршрут для виведення сторінки з таблицею
        app.get('/', async (req, res) => {
            try {
                // Отримати останні 5 об'єктів та вивести їх у таблицю
                const recentBooks = await collection.find().sort({ _id: -1 }).limit(5).toArray();

                // Вивести сторінку з таблицею
                res.send(`
                    <html>
                        <head>
                            <title>Список книг</title>
                            <link rel="stylesheet" type="text/css" href="/styles.css">
                        </head>
                        <body>
                            <h1>Список книг</h1>
                            <table>
                                <tr>
                                    <th>Назва</th>
                                    <th>Автор</th>
                                    <th>Жанр</th>
                                    <th>Детально</th>
                                    <th>Видалити</th>
                                </tr>
                                ${recentBooks.reverse().map((book, index) => `
                                    <tr>
                                        <td>${book.title}</td>
                                        <td>${book.author}</td>
                                        <td>${book.genre}</td>
                                        <td><a class="button" href="/object/${index + 1}">Детально</a></td>
                                        <td><a class="button" href="/delete/${index + 1}">Видалити</a></td>
                                    </tr>
                                `).join('')}
                            </table>
                            <a class="button" href="/add">Додати книгу</a>
                        </body>
                    </html>
                `);
            } catch (error) {
                console.error('Помилка при отриманні об\'єктів з бази даних:', error);
                res.status(500).send('Помилка сервера');
            }
        });

        // Головний маршрут для додавання нового об'єкту
        app.get('/add', (req, res) => {
            res.send(`
                <html>
                    <head>
                        <title>Додати нову книгу</title>
                        <link rel="stylesheet" type="text/css" href="/styles.css">
                    </head>
                    <body>
                        <h1>Додати нову книгу</h1>
                        <form method="post" action="/add">
                            <label for="title">Назва:</label>
                            <input type="text" id="title" name="title" required><br>

                            <label for="author">Автор:</label>
                            <input type="text" id="author" name="author" required><br>

                            <label for="genre">Жанр:</label>
                            <input type="text" id="genre" name="genre" required><br>

                            <label for="publisher">Видавництво:</label>
                            <input type="text" id="publisher" name="publisher" required><br>

                            <label for="pageCount">Кількість сторінок:</label>
                            <input type="number" id="pageCount" name="pageCount" required><br>

                            <button class="button" type="submit">Додати книгу</button>
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

        // Обробка запиту POST для додавання нового об'єкту
        app.post('/add', express.urlencoded({ extended: true }), async (req, res) => {
            const { title, author, genre, publisher, pageCount } = req.body;
            const numericId = await getNextNumericId(); // Отримуємо новий числовий id

            // Додати новий об'єкт у базу даних
            try {
                const result = await collection.insertOne(new Book(parseInt(numericId), title, author, genre, publisher, parseInt(pageCount)));
                console.log('Додано новий об\'єкт з ID:', numericId);
                res.redirect('/');
            } catch (error) {
                console.error('Помилка при додаванні об\'єкта до бази даних:', error);
                res.status(500).send('Помилка сервера');
            }
        });

        // Метод класу для виведення детальної інформації про об’єкт
        app.get('/object/:numericId', async (req, res) => {
            try {
                const numericId = parseInt(req.params.numericId);
                const selectedBook = await collection.findOne({ numericId });
        
                if (selectedBook) {
                    res.send(`
                        <html>
                            <head>
                                <title>Детальна інформація про книгу</title>
                                <link rel="stylesheet" type="text/css" href="/styles.css">
                            </head>
                            <body>
                                <h1>Детальна інформація про книгу</h1>
                                <p>Назва: ${selectedBook.title}</p>
                                <p>Автор: ${selectedBook.author}</p>
                                <p>Жанр: ${selectedBook.genre}</p>
                                <p>Видавництво: ${selectedBook.publisher}</p>
                                <p>Кількість сторінок: ${selectedBook.pageCount}</p>
                                <a class="button" href="/">Повернутися на головну сторінку</a>
                            </body>
                        </html>
                    `);
                } else {
                    res.status(404).send('Об\'єкт не знайдено');
                }
            } catch (error) {
                console.error('Помилка при отриманні об\'єкта з бази даних:', error);
                res.status(500).send('Помилка сервера');
            }
        });
        
        // Метод класу для видалення об'єкта
        app.get('/delete/:numericId', async (req, res) => {
            try {
                const numericId = parseInt(req.params.numericId);
                const deletedBook = await collection.findOneAndDelete({ numericId });
        
                if (deletedBook) {
                    res.redirect('/');
                } else {
                    res.status(404).send('Об\'єкт не знайдено');
                }
            } catch (error) {
                console.error('Помилка при видаленні об\'єкта з бази даних:', error);
                res.status(500).send('Помилка сервера');
            }
        });

        app.listen(port, () => {
            console.log(`Сервер запущено на http://localhost:${port}`);
        });
    } catch (error) {
        console.error('Помилка підключення до MongoDB:', error);
    }
}

startServer();