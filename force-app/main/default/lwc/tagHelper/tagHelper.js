//spell check out status
const spellCheck =(term)=>{
    return   term.startsWith('sou') && term != 'southern stock' ? 'southern stock' :
             term.startsWith('l') && term != 'limited' ? 'limited' :
             term.startsWith('c') && term != 'close-out' ? 'close-out' :
             term.startsWith('e') && term != 'exempt' ? 'exempt' :
             term.startsWith('s') && term != 'stock' ? 'stock' :
             term
}

const searchString = (term, stock)=>{
    let searchString = 'FIND \''+term+'\' IN ALL FIELDS RETURNING Tag__c(id, Tag_Description__c, Search_Slug_2__c,'
                              +' Product__c, Product_Name__c, ATS_Score__c, Stock_Status__c where product__r.IsActive = true';
    
    stock != null ? searchString += ' and Stock_Status__c  = \''+stock+'\' order by ATS_Score__c desc nulls last)' :searchString += ' order by ATS_Score__c desc nulls last)'; 
    return searchString; 
  }
export{
       spellCheck,
       searchString 
      }