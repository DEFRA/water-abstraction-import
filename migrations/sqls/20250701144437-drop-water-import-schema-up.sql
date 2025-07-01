/*
  Drop schema used by charge versions import process

  The water_import schema served two purposes. When the project used pgboss message queues for orchestrating the import
  it held the tables where jobs were stored and archived.

  It was also used as part of the process to import charge version information from NALD.

  This project no longer uses pgboss or messages queues. And in this change we are removing the charge version import
  that was only meant to be one-off job back when WRLS took over from NALD.

  So, the schema no longer serves a purpose so can be removed.
*/

DROP SCHEMA IF EXISTS "water_import" CASCADE;
