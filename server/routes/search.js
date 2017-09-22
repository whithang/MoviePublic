'use strict';
const express = require('express');
const middleware = require('../middleware');
const bodyParser = require('body-parser');
const fuse = require('fuse.js');
const Fuse = require('../../node_modules/fuse.js/src/index.js');
const router = express.Router();
const app = express();
const tmdb = require('../movieAPIHelpers/tmdb.js');
const tmdbHelp = require('../movieAPIHelpers/tmdbHelpers.js');
const models = require('../../db/models');
const searchDb = require('../../mongodb/db.js');
const search = require('./search.js');

const sortByKey = (array, key) => {
  return array.sort(function(a, b) {
    var x = a[key]; var y = b[key];
    return ((x < y) ? -1 : ((x > y) ? 1 : 0));
  });
};

router.route('/')
  .get(middleware.auth.verify, (req, res, next) => {

    module.exports.sortByKey = (array, key) => {
      return array.sort(function(a, b) {
        var x = a[key]; var y = b[key];
        return ((x > y) ? -1 : ((x < y) ? 1 : 0));
      });
    };

    var outputarr = [];

    searchDb.getMovies({}, (err, res1) => {

      if (err) {
        alert('search broken try again');
      } else {

        tmdbHelp.getMoviesByTitle(req.query.value, (err, data) => {
          if (err) {
            console.log('TMBD Search Error');
          } else {
            //grab each movie title and send API request to OMDB to get movie data
            searchDb.saveMovies(data, () => {
              searchDb.getMovies({}, (err, res2) => {
                if (err) {
                  console.log('borken in 2nd part of savemovies db');
                } else {
                  var options = {
                    shouldSort: true,
                    tokenize: true,
                    findAllMatches: true,
                    includeScore: true,
                    includeMatches: true,
                    threshold: 0.6,
                    location: 0,
                    distance: 100,
                    maxPatternLength: 32,
                    minMatchCharLength: 3,
                    keys: [
                      'title',
                      'actors',
                      'director',
                      'genre',
                      'year',
                    ]
                  };
                  var fuse = new Fuse(res2, options); // "list" is the item array
                  var result = fuse.search(req.query.value);
                  var sorted = sortByKey(result, 'score');
                  // console.log('*************** sorted[0] ', sorted[0]);
                  // console.log('************** sorted', sorted);
                  // console.log(res2, 'Post Sorted - Res2');
                  // MovieController.getAllMovies();
                  var movieArr = [];
                  for (var i = 0; i < sorted.length; i++) {
                    movieArr.push(sorted[i].item);
                    if (i === sorted.length - 1) {
                      res.send(movieArr);
                    }
                  }

                }
              });

            });

          }
        });

      }
    });
  });

router.route('/id')
  .get(middleware.auth.verify, (req, res, next) => {
    // console.log(req, '@@@@@@2');
    searchDb.searchByIds(req.body, (err, data) => {
      if (err) {
        throw err;
      } else {
        res.json(data);
      }
    });
  });

router.route('/upcoming')
.get(middleware.auth.verify, (req, res, next) => {
  var minArray = req.query.minDate.split(' ');
  var maxArray = req.query.maxDate.split(' ');
  var monthArray = {
  'Jan': '01',
  'Feb': '02',
  'Mar': '03',
  'Apr': '04',
  'May': '05',
  'Jun': '06',
  'Jul': '07',
  'Aug': '08',
  'Sep': '09',
  'Oct': '10',
  'Nov': '11',
  'Dec': '12'
  }
  var newMinArray = minArray[3] + '-' + monthArray[minArray[1]] + '-' + minArray[2];
  var newMaxArray = maxArray[3] + '-' + monthArray[maxArray[1]] + '-' + maxArray[2]; 

  tmdbHelp.getMoviesByTitle(req.query.value, (err, data) => {
          if (err) {
            console.log(err, 'ERRORGETMOVIESERROR');
          } else {
            //grab each movie title and send API request to OMDB to get movie data
            searchDb.saveMovies(data, () => {
              searchDb.getMovies({}, (err, res2) => {
                var options = {
                  shouldSort: true,
                  tokenize: true,
                  findAllMatches: true,
                  includeScore: true,
                  includeMatches: true,
                  threshold: 0.6,
                  location: 0,
                  distance: 100,
                  maxPatternLength: 32,
                  minMatchCharLength: 3,
                  keys: [
                    'title',
                    'actors',
                    'director',
                    'genre',
                    'year',
                  ]
                };
                var fuse = new Fuse(res2, options); // "list" is the item array
                var result = fuse.search(req.query.value);
                var sorted = sortByKey(result, 'score');
                // console.log('*************** sorted[0] ', sorted[0]);
                // console.log('************** sorted', sorted);
                // console.log(res2, 'Post Sorted - Res2');
                // MovieController.getAllMovies();
                var movieArr = [];
                for (var i = 0; i < sorted.length; i++) {
                  movieArr.push(sorted[i].item);
                  if (i === sorted.length - 1) {
                    res.json(movieArr);
                  }
                }
                MovieController.addMovies(res2, (err, results) => {
                  if (err) {
                    console.log(err, 'Server Response - PG Unable to Add Movies');
                    // res.status(500).send('Postgres: Error adding movies');
                  } else {
                    console.log(results, 'Server Response - PG Added Data');
                    // res.status(201).send('Server Response - PG Added Data');
                  }
               });
            });
         });
      }
   });
})
    
   

module.exports = router;
