import { LightningElement,track } from 'lwc';
import searchTag from '@salesforce/apex/quickPriceSearch.searchTagSOSL';
import FORM_FACTOR from '@salesforce/client/formFactor';
import {spellCheck, searchString} from 'c/tagHelper';
const REGEX_SOSL_RESERVED = /(\?|&|\||!|\{|\}|\[|\]|\(|\)|\^|~|\*|:|"|\+|\\)/g;
const REGEX_STOCK_RES = /(stock|sock|limited|limted|lmited|limit|close-out|close out|closeout|close  out|exempt|exmpet|exemept|southern stock|southernstock|southner stock)/g; 
export default class TagContainer extends LightningElement {
    @track tagCards = [];
    searchTerm;
    searchQuery;
    loaded = false; 
    formSize;
    priceBook = '01s410000077vSKAAY'; 
    stock; 
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
           // this.searchTerm = evt.target.value;
            this.searchTwo(); 
        }
    }

    handleSearch(e){
        e.preventDefault();
        this.searchTwo(); 
    }
    searchTwo(){
        this.stock = this.template.querySelector('[data-value="searchInput"]').value.trim().toLowerCase().match(REGEX_STOCK_RES); 
        this.searchTerm = this.template.querySelector('[data-value="searchInput"]').value.toLowerCase().replace(REGEX_SOSL_RESERVED,'?').replace(REGEX_STOCK_RES,'').trim();
     
        
        if(this.searchTerm.length<3){
            //add lwc alert here
            return;
        }
        const start = Date.now();
        if(this.stock){
            this.stock = spellCheck(this.stock[0])
            this.searchQuery = searchString(this.searchTerm, this.stock);   
        }else{
            this.searchQuery = searchString(this.searchTerm, this.stock)
        }
       // console.log(this.searchQuery);
        
        this.loaded = false
        searchTag({ searchKey: this.searchQuery})
        .then((res)=>{
            let name; 
            let score;
            let url;
            let tagDesc;
            let status; 
            this.tagCards = res.map(x=>{
               
                name = x.Product_Name__c,
                score = x.ATS_Score__c
                url = 'https://advancedturf--cpq.sandbox.lightning.force.com/lightning/r/Tag__c/'+x.Product__c+'/view'
                tagDesc = x.Tag_Description__c
                status = x.Stock_Status__c
                return {...x, name, score, url, tagDesc, status}
            })

            this.loaded = true;
            const end = Date.now();
            for(let i=0; i< res.length; i++){
                console.log(res[i])
            }
            console.log(`Execution time: ${end - start} ms`); 
        }).catch(err=>{
            console.log(err)
            this.loaded = true; 
        })
    }
    
    handleInv(){
        alert('hey')
    }
}