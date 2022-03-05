const express = require("express");
const { open } = require("sqlite");
const sqlite3 = require("sqlite3");
const path = require("path");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");

const databasePath = path.join(__dirname, "store.db");

const app = express();

app.use(express.json());

let database = null;

const initializeDbAndServer = async () => {
  try {
    database = await open({
      filename: databasePath,
      driver: sqlite3.Database,
    });

    app.listen(3000, () =>
      console.log("Server Running at http://localhost:3000/")
    );
  } catch (error) {
    console.log(`DB Error: ${error.message}`);
    process.exit(1);
  }
};

initializeDbAndServer();

///
const convertStoreDbObjectToResponseObject = (dbObject) => {
    return {
      storeId: dbObject.store_id,
      storeName: dbObject.store_name,
      storeLocation: dbObject.store_location,
    };
  };

  ///
  function authenticateToken(request, response, next) {
    let jwtToken;
    const authHeader = request.headers["authorization"];
    if (authHeader !== undefined) {
      jwtToken = authHeader.split(" ")[1];
    }
    if (jwtToken === undefined) {
      response.status(401);
      response.send("Invalid JWT Token");
    } else {
      jwt.verify(jwtToken, "MY_SECRET_TOKEN", async (error, payload) => {
        if (error) {
          response.status(401);
          response.send("Invalid JWT Token");
        } else {
          next();
        }
      });
    }
  }

  ///
  
  app.get("/states/", authenticateToken, async (request, response) => {
    const getStatesQuery = `
      SELECT
        *
      FROM
        store;`;
    const statesArray = await database.all(getStatesQuery);
    response.send(
      statesArray.map((eachState) =>
        convertStoreDbObjectToResponseObject(eachState)
      )
    );
  });


  //// registation of the website 
  //// register like a username, name, password, gender, location

app.post("/register", async (request, response) => {
  const { username, name, password, gender, location } = request.body;
  const hashedPassword = await bcrypt.hash(password, 10);
  const selectUserQuery = `SELECT * FROM user WHERE username = '${username}';`;
  const databaseUser = await database.get(selectUserQuery);
  if (databaseUser === undefined) {
    const createUserQuery = `
     INSERT INTO
      user (username, name, password, gender, location)
     VALUES
      (
       '${username}',
       '${name}',
       '${hashedPassword}',
       '${gender}',
       '${location}'  
      );`;
    if (validatePassword(password)) {
      await database.run(createUserQuery);
      response.send("User created successfully");
    } else {
      response.status(400);
      response.send("Password is too short");
    }
  } else {
    response.status(400);
    response.send("User already exists");
  }
});
  //// POST API  with login
  app.post("/login/", async (request, response) => {
    const { username, password } = request.body;
    const selectUserQuery = `SELECT * FROM user WHERE username = '${username}';`;
    const databaseUser = await database.get(selectUserQuery);
    if (databaseUser === undefined) {
      response.status(400);
      response.send("Invalid user");
    } else {
      const isPasswordMatched = await bcrypt.compare(
        password,
        databaseUser.password
      );
      if (isPasswordMatched === true) {
        const payload = {
          username: username,
        };
        const jwtToken = jwt.sign(payload, "MY_SECRET_TOKEN");
        response.send({ jwtToken });
      } else {
        response.status(400);
        response.send("Invalid password");
      }
    }
  });

/// PUT API change-password
app.put("/change-password", async (request, response) => {
  const { username, oldPassword, newPassword } = request.body;
  const selectUserQuery = `SELECT * FROM user WHERE username = '${username}';`;
  const databaseUser = await database.get(selectUserQuery);
  if (databaseUser === undefined) {
    response.status(400);
    response.send("Invalid user");
  } else {
    const isPasswordMatched = await bcrypt.compare(
      oldPassword,
      databaseUser.password
    );
    if (isPasswordMatched === true) {
      if (validatePassword(newPassword)) {
        const hashedPassword = await bcrypt.hash(newPassword, 10);
        const updatePasswordQuery = `
          UPDATE
            user
          SET
            password = '${hashedPassword}'
          WHERE
            username = '${username}';`;

        const user = await database.run(updatePasswordQuery);

        response.send("Password updated");
      } else {
        response.status(400);
        response.send("Password is too short");
      }
    } else {
      response.status(400);
      response.send("Invalid current password");
    }
  }
});

/// List of all stores for the user
app.get("/store/:storeId/", authenticateToken, async (request, response) => {
    const {userId } = request.params;
    const getStoreQuery = `
      SELECT 
        *
      FROM 
        store
      WHERE 
        user_id = ${userId};`;
    const state = await database.get(getStoreQuery);
    response.send(convertStoreDbObjectToResponseObject(state));
  });

  /// List out all the books in inventory inside the store.
  app.get("/store/:storeId/", authenticateToken, async (request, response) => {
    const {storeBook} = request.params;
    const getStoreQuery = `
      SELECT 
        *
      FROM 
        store
      WHERE 
        store_book =${storeBook};`;
    const state = await database.get(getStoreQuery);
    response.send(convertStoreDbObjectToResponseObject(state));
  });

  ///Add a new book

  app.post("/books/", async (request, response) => {
    const bookDetails = request.body;
    const {
      title,
      authorId,
      rating,
      ratingCount,
      reviewCount,
      description,
      pages,
      dateOfPublication,
      editionLanguage,
      price,
      onlineStores,
    } = bookDetails;
    const addBookQuery = `
      INSERT INTO
        book (title,author_id,rating,rating_count,review_count,description,pages,date_of_publication,edition_language,price,online_stores)
      VALUES
        (
          '${title}',
           ${authorId},
           ${rating},
           ${ratingCount},
           ${reviewCount},
          '${description}',
           ${pages},
          '${dateOfPublication}',
          '${editionLanguage}',
           ${price},
          '${onlineStores}'
        );`;
  
    const dbResponse = await db.run(addBookQuery);
    const bookId = dbResponse.lastID;
    response.send({ bookId: bookId });
  });

  ////Update inventory for an existing book
  app.put("/books/:bookId/", async (request, response) => {
    const { bookId } = request.params;
    const bookDetails = request.body;
    const {
      title,
      authorId,
      rating,
      ratingCount,
      reviewCount,
      description,
      pages,
      dateOfPublication,
      editionLanguage,
      price,
      onlineStores,
    } = bookDetails;
    const updateBookQuery = `
      UPDATE
        book
      SET
        title='${title}',
        author_id=${authorId},
        rating=${rating},
        rating_count=${ratingCount},
        review_count=${reviewCount},
        description='${description}',
        pages=${pages},
        date_of_publication='${dateOfPublication}',
        edition_language='${editionLanguage}',
        price=${price},
        online_stores='${onlineStores}'
      WHERE
        book_id = ${bookId};`;
    await db.run(updateBookQuery);
    response.send("Book Updated Successfully");
  });

  ///Remove from the inventory.
  app.delete("/store/:bookId/", async (request, response) => {
    const { bookId } = request.params;
    const deleteBookQuery = `
      DELETE FROM
        book
      WHERE
        book_id = ${bookId};`;
    await db.run(deleteBookQuery);
    response.send("Book Deleted Successfully");
  });


module.exports = app;
