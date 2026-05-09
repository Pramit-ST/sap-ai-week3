using sap.support from '../db/schema';

service RagService {

    action askTickets(question : String) returns {
        answer  : String;
        sources : array of {
            id       : String;
            title    : String;
            score    : Decimal;
        };
    };
}