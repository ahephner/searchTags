import { LightningElement,track } from 'lwc';
import searchTag from '@salesforce/apex/quickPriceSearch.searchTagSOSL';
import FORM_FACTOR from '@salesforce/client/formFactor';

export default class TagContainer extends LightningElement {
    @track tagCards = [];
    searchTerm;
    loaded = false; 
    formSize;
    priceBook = '01s410000077vSKAAY'; 

    connectedCallback(){ 
        this.formSize = this.screenSize(FORM_FACTOR);
        this.loaded = true;     
    }       

    screenSize = (screen) => {
        return screen === 'Large'? true : false  
    }
    handleKeys(evt){
        let enterKey = evt.keyCode === 13;
        if(enterKey){
            this.searchTerm = evt.target.value;
            this.searchTwo(); 
        }
    }

    handleSearch(e){
        e.preventDefault();
        this.searchTwo(); 
    }
    searchTwo(){
        this.searchTerm = this.template.querySelector('[data-value="searchInput"]').value
        if(this.searchTerm.length<3){
            //add lwc alert here
            return;
        }
        this.loaded = false
        searchTag({ searchKey: this.searchTerm})
        .then((res)=>{
            let name; 
            let score;
            let url;
            let tagDesc
            this.tagCards = res.map(x=>{
               
                name = x.Product_Name__c,
                score = x.ATS_Score__c
                url = 'https://advancedturf--cpq.sandbox.lightning.force.com/lightning/r/Tag__c/'+x.Product__c+'/view'
                tagDesc = x.Tag_Description__c
                return {...x, name, score, url, tagDesc}
            })
            console.log(res);
            //console.log(JSON.parse(res))
            this.loaded = true; 
        })
    }
    
    handleInv(){
        alert('hey')
    }
}