using sap.support from '../db/schema';

service SearchService {

  entity Tickets as projection on support.Tickets
    excluding { embedding };

  // Separate action to generate embedding for a ticket
  action generateEmbedding(ID : UUID)    returns String;

  action semanticSearch(
    query : String,
    topK  : Integer
  ) returns array of {
    ID    : UUID;
    title : String;
    score : Decimal;
  };
}