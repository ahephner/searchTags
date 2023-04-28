//Bit of a confusing name. 
//Tags are a junction object between Search_Label__c and Product2
import { LightningElement, api, wire } from 'lwc';
import findLabels from '@salesforce/apex/searchLabels.findLabels';
const REGEX_SOSL_RESERVED = /(\?|&|\||!|\{|\}|\[|\]|\(|\)|\^|~|\*|:|"|\+|\\)/g;
const SEARCH_DELAY = 500; 
export default class AddTags extends LightningElement{
    @api tagpills = [];
    results;
    error;
    queryTerm
    loading; 
    //SEARCH VARS
    minSearchTerm = 3;
    searchTimeOut;

//GET LABELS
@wire(findLabels,{queryTerm:'$queryTerm'})
wiredList(result){
    if(result.data){
        console.log(result.data)
        this.results = result.data;
        this.loading = false;
        this.showResult = true;  
    }else if(result.error){
        console.log(result.error); 
    }
}
//SEARCH FUNCTION
    handleKeyUp(searchTerm){
        searchTerm.preventDefault();
        if(this.minSearchTerm>searchTerm.target.value.length){
            return;
        }

        const key = searchTerm.target.value.trim().replace(REGEX_SOSL_RESERVED,'?').toLowerCase();
          
        if(this.searchTimeOut){
            clearTimeout(this.searchTimeOut);
        }
        this.searchTimeOut = setTimeout(()=>{
            this.loading = true;
            
            this.queryTerm = key;
           console.log('sending ', this.queryTerm);
           
            this.searchTimeOut = null
        }, SEARCH_DELAY)
    }
}