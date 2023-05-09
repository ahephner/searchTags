public class quickPriceSearch {
    @AuraEnabled(cacheable = true)
    public static list<PricebookEntry> getPricing(string priceBookId, string searchKey){
         string searchterm = '%' + searchKey + '%'; 
         string pbId = priceBookId;
         string pClass = 'Simple';

         string query = 'Select Id,'
             		+ ' Product2.Name, Floor_Price__c, Product2.Product_Status__c,Product2.ProductCode, Agency_Product__c,product2.Total_Product_Items__c,'
             		+ ' Product2.Floor_Price__c,Floor_Margin__c,Level_1_UserView__c, Level_One_Margin__c, Level_2_UserView__c, Level_2_Margin__c, Product_Cost__c'
             		+ ' From PricebookEntry Where IsActive = True and Pricebook2Id =: pbId AND Product2.ProductClass =:pClass AND'
             		+ ' (Product2.ProductCode like :searchTerm or Product2.Name like :searchTerm)'
        			+ ' order by Product_Status__c  desc nulls last';
        //system.debug(query);
        list<PricebookEntry> results = Database.query(query);
        //system.debug(results);
        return results; 
       
    }
    
    @AuraEnabled(cacheable = true)
    public static list<list<sObject>> searchTag(string searchKey){
         //string searchterm = '%' + searchKey + '%'; 
         
        //list<tag__c> tags = Database.query('select Id, Product_Name__c, ATS_Score__c, Tag_description__c from tag__c where Search_Slug_2__c like :searchterm order by ATS_Score__c desc nulls last'); 
        //return tags; 
        //list<tag__c> tagList = new list<Tag__c>();
        String searchquery='FIND \''+searchKey+'\'IN ALL FIELDS RETURNING Tag__c(id, name, Search_Slug_2__c)'; 
        
		List<List<SObject>>searchList=search.query(searchquery);
		//system.debug(searchList[0]);        
        //list<Tag__c> tagList = new list((List<Tag__c)searchList[0]); 
        return searchList;
    }
    
        @AuraEnabled(cacheable = true)
    public static list<Tag__c> searchTagSOSL(string searchKey){
         //string searchterm = '%' + searchKey + '%'; 
        list<Tag__c> tagList = new list<Tag__c>();
        
        String searchquery='FIND \''+searchKey+'\'IN ALL FIELDS RETURNING Tag__c(id, Tag_Description__c, Search_Slug_2__c,'
            				+' Product__c, Product_Name__c, ATS_Score__c where product__r.IsActive = true)'; 
        
		List<List<SObject>>searchList=search.query(searchquery);
		       
        tagList = searchList[0]; 
        return tagList;
    }
}