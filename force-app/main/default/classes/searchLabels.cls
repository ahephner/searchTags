public with sharing class searchLabels {
    @AuraEnabled(cacheable=true)
    public  static list<Search_Label__c> findLabels(string queryTerm){
        string term = '%'+queryTerm+'%';
        list<Search_Label__c> labels = [select id, Name from Search_Label__c where name like :term];
        return labels; 
    }
}