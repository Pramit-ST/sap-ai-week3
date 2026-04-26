namespace sap.support;

entity Tickets {
  key ID          : UUID;
      title       : String(500);
      description : LargeString;
      status      : String(20);
      priority    : String(10);
      embedding   : LargeString;
}