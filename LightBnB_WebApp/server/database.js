const properties = require('./json/properties.json');
const users = require('./json/users.json');

const { Pool } = require('pg');
const res = require('express/lib/response');
const pool = new Pool({
  user: 'brcfelty',
  password: '123',
  host: 'localhost',
  database: 'lightbnb'
});

pool.query(`SELECT title FROM properties LIMIT 10;`).then(response => {})


/// Users

/**
 * Get a single user from the database given their email.
 * @param {String} email The email of the user.
 * @return {Promise<{}>} A promise to the user.
 */
const getUserWithEmail = function(email) {
  return pool
    .query(`SELECT * FROM users WHERE email = $1`, [email])
    .then((result) => {
      return result.rows[0];
    })
    .catch((err) => {
      console.log(err.message);
    });
};
exports.getUserWithEmail = getUserWithEmail;

/**
 * Get a single user from the database given their id.
 * @param {string} id The id of the user.
 * @return {Promise<{}>} A promise to the user.
 */
const getUserWithId = function(id) {
  return pool
    .query(`SELECT * FROM users WHERE id = $1`, [id])
    .then((result) => {
      return result.rows[0];
    })
    .catch((err) => {
      console.log(err.message);
    });
};
exports.getUserWithId = getUserWithId;


/**
 * Add a new user to the database.
 * @param {{name: string, password: string, email: string}} user
 * @return {Promise<{}>} A promise to the user.
 */
const addUser =  function(user) {
  const userName = user.name;
  const userEmail = user.email;
  const userPassword = user.password;

  return pool
    .query(`INSERT INTO users (name, email, password) VALUES ($1, $2, $3) RETURNING id`, [userName, userEmail, userPassword])
    .then((result) => {
      return result.rows[0];
    })
    .catch((err) => {
      console.log(err.message);
    });
}
exports.addUser = addUser;

/// Reservations

/**
 * Get all reservations for a single user.
 * @param {string} guest_id The id of the user.
 * @return {Promise<[{}]>} A promise to the reservations.
 */
const getAllReservations = function(guest_id, limit = 10) {
  return pool
  .query(`  SELECT reservations.*, properties.*, avg(property_reviews.rating) as average_rating
    FROM users 
    JOIN reservations ON users.id = reservations.guest_id
    JOIN property_reviews ON reservations.id = property_reviews.reservation_id
    JOIN properties ON properties.id = reservations.property_id
    WHERE users.id = $1
    GROUP BY reservations.id, properties.title, properties.cost_per_night, properties.id
    LIMIT $2;`, [guest_id, limit])
  .then((result) => {
    return result.rows;
  })
  .catch((err) => {
    console.log(err.message);
  });
}
exports.getAllReservations = getAllReservations;

/// Properties

/**
 * Get all properties.
 * @param {{}} options An object containing query options.
 * @param {*} limit The number of results to return.
 * @return {Promise<[{}]>}  A promise to the properties.
 */
 const getAllProperties = function (options, limit = 10) {
  // 1
  const queryParams = [];
  // 2
  let queryString = `
  SELECT properties.*, avg(property_reviews.rating) as average_rating
  FROM properties
  JOIN property_reviews ON properties.id = property_id
  `;

  // 3
  if (options.city) {
    queryParams.push(`%${options.city}%`);
    queryString += `WHERE city LIKE $${queryParams.length} `;
    if (options.owner_id) {
      queryParams.push(`${options.owner_id}`);
      queryString += `AND owner_id = $${queryParams.length} `;
    }
      if (options.minimum_price_per_night && options.maximum_price_per_night) {
        queryParams.push(`${options.minimum_price_per_night*100}`, `${options.maximum_price_per_night*100}` );
        queryString += `AND cost_per_night BETWEEN $${queryParams.length - 1} AND $${queryParams.length}`;
      }
    
      if (options.minimum_price_per_night && !options.maximum_price_per_night) {
        queryParams.push(`${options.minimum_price_per_night*100}`);
        queryString += `AND cost_per_night >= $${queryParams.length} `;
      }
    
      if (options.maximum_price_per_night && !options.minimum_price_per_night) {
        queryParams.push(`${options.maximum_price_per_night*100}`);
        queryString += `AND cost_per_night <= $${queryParams.length} `;
      }
    
      if (options.minimum_rating) {
        queryParams.push(`${options.minimum_rating}`);
        queryString += `AND rating >= $${queryParams.length} `;
      }
  }

  if (options.owner_id && !options.city) {
    queryParams.push(`${options.owner_id}`);
    queryString += `WHERE owner_id = $${queryParams.length} `;
    if (options.minimum_price_per_night && options.maximum_price_per_night) {
      queryParams.push(`${options.minimum_price_per_night*100}`, `${options.maximum_price_per_night*100}` );
      queryString += `AND cost_per_night BETWEEN $${queryParams.length - 1} AND $${queryParams.length}`;
    }
  
    if (options.minimum_price_per_night && !options.maximum_price_per_night) {
      queryParams.push(`${options.minimum_price_per_night*100}`);
      queryString += `AND cost_per_night >= $${queryParams.length} `;
    }
  
    if (options.maximum_price_per_night && !options.minimum_price_per_night) {
      queryParams.push(`${options.maximum_price_per_night*100}`);
      queryString += `AND cost_per_night <= $${queryParams.length} `;
    }
  
    if (options.minimum_rating) {
      queryParams.push(`${options.minimum_rating}`);
      queryString += `AND rating >= $${queryParams.length} `;
    }
  }

  if (options.minimum_price_per_night && options.maximum_price_per_night && !options.city && !options.owner_id) {
    queryParams.push(`${options.minimum_price_per_night*100}`, `${options.maximum_price_per_night*100}` );
    queryString += `WHERE cost_per_night BETWEEN $${queryParams.length - 1} AND $${queryParams.length}`;
    if (options.minimum_rating) {
      queryParams.push(`${options.minimum_rating}`);
      queryString += `AND rating >= $${queryParams.length} `;
    }
  }

  if (options.minimum_price_per_night && !options.maximum_price_per_night && !options.city && !options.owner_id) {
    queryParams.push(`${options.minimum_price_per_night*100}`);
    queryString += `WHERE cost_per_night >= $${queryParams.length} `;
    if (options.minimum_rating) {
      queryParams.push(`${options.minimum_rating}`);
      queryString += `WHERE rating >= $${queryParams.length} `;
    }
  }

  if (options.maximum_price_per_night && !options.minimum_price_per_night && !options.city && !options.owner_id) {
    queryParams.push(`${options.maximum_price_per_night*100}`);
    queryString += `WHERE cost_per_night <= $${queryParams.length} `;
    if (options.minimum_rating) {
      queryParams.push(`${options.minimum_rating}`);
      queryString += `WHERE rating >= $${queryParams.length} `;
    }
  }

  if (options.minimum_rating && !options.minimum_price_per_night && !options.maximum_price_per_night && !options.city && !options.owner_i ) {
    queryParams.push(`${options.minimum_rating}`);
    queryString += `WHERE rating >= $${queryParams.length} `;
  }

  // 4
  queryParams.push(limit);
  queryString += `
  GROUP BY properties.id
  ORDER BY cost_per_night
  LIMIT $${queryParams.length};
  `;

  // 5
  // console.log(queryString, queryParams);

  // 6
  return pool.query(queryString, queryParams).then((res) => res.rows);
};
exports.getAllProperties = getAllProperties;

/**
 * Add a property to the database
 * @param {{}} property An object containing all of the property details.
 * @return {Promise<{}>} A promise to the property.
 */
const addProperty = function(property) {
  // Property
  const newOwnerId = property.owner_id;
  const newTitle = property.title;
  const newDescription = property.description;
  const newThumbnail = property.thumbnail_photo_url;
  const newCover = property.cover_photo_url;
  const newCost = property.cost_per_night;
  const newStreet = property.street;
  const newCity = property.city;
  const newProvince = property.province;
  const newPostalCost = property.post_code;
  const newCountry = property.country;
  const newParking = property.parking_spaces;
  const numBathrooms = property.number_of_bathrooms;
  const numBedrooms = property.number_of_bedrooms;

  return pool
    .query(`INSERT INTO properties (owner_id, title, description, thumbnail_photo_url, cover_photo_url, cost_per_night, street, city, province, post_code, country, parking_spaces, number_of_bathrooms, number_of_bedrooms) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14) RETURNING *`, [newOwnerId, newTitle, newDescription, newThumbnail, newCover, newCost, newStreet, newCity, newProvince, newPostalCost, newCountry, newParking, numBathrooms, numBedrooms])
    .then((result) => {
      return result.rows[0];
    })
    .catch((err) => {
      console.log(err.message);
    });
}
exports.addProperty = addProperty;

const addReservation = function(reservation) {
  const newStart = reservation.start_date;
  const newEnd = reservation.end_date;
  const propertyId = reservation.property_id;
  const guestId = reservation.guest_id;
  //console.log(reservation)

  return pool
    .query(`INSERT INTO reservations (start_date, end_date, property_id, guest_id) VALUES ($1, $2, $3, $4) RETURNING *`, [newStart, newEnd, propertyId, guestId])
    .then((result) => {
      //console.log(result.rows)
      return result.rows[0];
    })
    .catch((err) => {
      console.log(err.message);
    });
}
exports.addReservation = addReservation;