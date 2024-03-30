const express = require('express');
const { MongoClient, ObjectId } = require('mongodb');
const app = express();
const port = 3000;

app.set('view engine', 'ejs'); // Встановлюємо двигун шаблонізації EJS

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

                // Рендеринг сторінки з використанням шаблонів EJS
                res.render('index', { pageTitle: 'Список книг', recentBooks });
            } catch (error) {
                console.error('Помилка при отриманні об\'єктів з бази даних:', error);
                res.status(500).send('Помилка сервера');
            }
        });

        // Головний маршрут для додавання нового об'єкту
        app.get('/add', (req, res) => {
            res.render('add', { pageTitle: 'Додати нову книгу' });
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
                    res.render('details', { pageTitle: 'Детальна інформація про книгу', book: selectedBook });
                } else {
                    res.status(404).render('404', { pageTitle: 'Помилка 404' }); // Рендеринг сторінки 404.ejs
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
                    res.status(404).render('404', { pageTitle: 'Помилка 404' }); // Рендеринг сторінки 404.ejs
                }
            } catch (error) {
                console.error('Помилка при видаленні об\'єкта з бази даних:', error);
                res.status(500).send('Помилка сервера');
            }
        });

        app.get('/about', (req, res) => {
            res.render('about', { pageTitle: 'Про сайт' });
        });        

        // Middleware для обробки помилки 404
        app.use((req, res, next) => {
            res.status(404).render('404', { pageTitle: 'Помилка 404' }); // Рендеринг сторінки 404.ejs
        });

        app.listen(port, () => {
            console.log(`Сервер запущено на http://localhost:${port}`);
        });
    } catch (error) {
        console.error('Помилка підключення до MongoDB:', error);
    }
}

startServer();
