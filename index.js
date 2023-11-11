import express from "express";
import bodyParser from "body-parser";
import pg from "pg";

const app = express();
const port = 3000;

const db = new pg.Client({
  user: "postgres", // Postgres username automatically defaults to postgres
  host: "localhost",
  database: "world", // The DB we want to use
  password: "Thisisnotmyactualpassword", // The password for Postgresql
  port: 3001, // The port Postgresql runs on
});

// Connect to the database we defined above
db.connect();

// Using the body parser allows us to use this code: const input = req.body["country"];
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static("public"));

// Setting the initial placeholder for the input field
let placeHolder = "Enter country name";

// Function which checks to see what countries we've visited and returns them in
// an array
const checkVisited = async () => {

  // Getting all country_code entries from the visited_countries table
  const result = await db.query(
    "SELECT country_code FROM visited_countries"
  );

  let countries = [];

  // For each row in our result variable, we push the country's country_code into
  // our countries array
  result.rows.forEach((country) => {
    countries.push(country.country_code);
  });
  // We now return our populated array
  return countries;
}

app.get("/", async (req, res) => {
  // Getting an array of our visited countries
  const countries = await checkVisited();
  if (countries) {
    res.render("index.ejs", { countries: countries, placeHolder: placeHolder, total: countries.length });
  };
});

app.post("/add", async (req, res) => {
  // Getting the input from the form input field where name=country in index.ejs
  const input = req.body["country"];
  // Querying our PostreSQL database. $1 is just a common SQL placeholder, in this
  // case it is a placeholder for what is inside of the brackets: [input]. So we're 
  // essentially tring to find the the user input in our already visited countries
  const result = await db.query(
    // '%' is a wildcard variable is SQL. Here we are basically saying as long as
    // the country name you input is somewhere in that name even if there's other
    // stuff before or after the input, as long as it contains that string we'll 
    // count it as a match. We also use LOWER(country_name) here to make all country
    // names in the table lower case before we search the table
    "SELECT country_code FROM countries WHERE LOWER(country_name) LIKE '%' || $1 || '%';",
    [input.toLowerCase()]
  );

  // If there is a result, we take that row's country code and store it in the 
  // variable countryCode
  if (result.rows.length !== 0) {
    const data = result.rows[0];
    const countryCode = data.country_code;
    // Going through our visited_countries table to see if this country code is already 
    // there
    const previouslyVisitedCountry = await db.query("SELECT country_code FROM visited_countries WHERE country_code = $1",
      [countryCode]
    );
    // If this countryCode is present in the table of visiter_countries set the
    // input placeholder to let us know that and redirect back to home
    if (previouslyVisitedCountry.rows.length !== 0) {
      placeHolder = "Country has already been added, try again."
      res.redirect("/");
    } else {
      // We're now inserting our countryCode into our visited_countries table. The
      // visited_countries table only has one column which is used for country codes,
      // which is why we're only inserting the country code and no other data into
      // the table
      await db.query(
        "INSERT INTO visited_countries (country_code) VALUES ($1)",
        [countryCode]
      );
      // Resetting the placeHolder before we go home after successfully adding a new
      // country
      placeHolder = "Enter country name";
      // Now we redirect back home.
      res.redirect("/");
    };
  } else {
    placeHolder = "Country name does not exist, try again."
    res.redirect("/");
  };
});

app.listen(port, () => {
  console.log(`Server running on http://localhost:${port}`);
});