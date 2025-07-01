/*
  Because the up migration drops the schema that holds the migrations table,
  there is no way for the down migration to work. The only way to go back would\
  be to delete this specific migration, then run the `npm run migrate` again.
*/
