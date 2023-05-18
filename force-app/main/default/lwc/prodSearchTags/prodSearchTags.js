import { LightningElement, api, track, wire } from 'lwc';
import searchTag from '@salesforce/apex/quickPriceSearch.cpqSearchTag';
import { MessageContext, publish} from 'lightning/messageService';
import Opportunity_Builder from '@salesforce/messageChannel/Opportunity_Builder__c';
import { getObjectInfo, getPicklistValues} from 'lightning/uiObjectInfoApi';
import PRODUCT_OBJ from '@salesforce/schema/Product2';
import SUB_CAT from '@salesforce/schema/Product2.Subcategory__c';
import PROD_FAM from '@salesforce/schema/Product2.Product_Family__c';

const REGEX_SOSL_RESERVED = /(\?|&|\||!|\{|\}|\[|\]|\(|\)|\^|~|\*|:|"|\+|\\)/g;
const REGEX_STOCK_RES = /(stock|sock|limited|limted|lmited|limit|close-out|close out|closeout|close  out|exempt|exmpet|exemept|southern stock|southernstock|southner stock)/g; 
import {spellCheck, cpqSearchString} from 'c/tagHelper';
export default class ProdSearchTags extends LightningElement {
    @api recordId;
    //@api priceBookId; //will need to uncomment when switching 
    @track openPricing = true;
    loaded = true; 
    @track prod = [];
    error; 
    searchKey;
    searchQuery; 
    stock; 
    pf = 'All';
    cat = 'All';
    productsSelected = 0;
    @track selection = [];
    newProd; 
    @track columnsList = [
        {type: 'button-icon', 
         initialWidth: 75,typeAttributes:{
            iconName:{fieldName: 'rowName'}, 
            name: 'add prod' ,
            title: 'Add',
            disabled: false,
            value: {fieldName: 'rowValue'},
            variant: { fieldName: 'rowVariant' },
        }, 
        cellAttributes: {
            style: 'transform: scale(0.75)'}
        },
        {label: 'Name', fieldName:'Name', cellAttributes:{alignment:'left'}, "initialWidth": 625},
        {label: 'Code', fieldName:'ProductCode', cellAttributes:{alignment:'center'}, "initialWidth": 137},
        {label: 'Status', fieldName:'Status', cellAttributes:{alignment:'center'}, sortable: "true"},
        {label:'Floor Type', fieldName:'Floor', cellAttributes:{alignment:'center'}},
        {label: 'Floor Price', fieldName:'Floor_Price__c', 
        type:'currency', cellAttributes:{alignment:'center'}},
        {label:'Comp OH', fieldName:'qtyOnHand', cellAttributes:{alignment:'center'}}
    ]

    @api
    openPriceScreen(){
        this.openPricing = true;
        this.loaded = true;  
    }

    closePriceScreen(){
        this.productsSelected = 0; 
        this.openPricing = false; 
    }

        //Subscribe to Message Channel
        @wire(MessageContext)
        messageContext; 
        //need this to get picklist
        @wire(getObjectInfo, { objectApiName: PRODUCT_OBJ })
        objectInfo;
        //get sub category picklist
        @wire(getPicklistValues, {
            recordTypeId: "$objectInfo.data.defaultRecordTypeId",
            fieldApiName: SUB_CAT
          })
          subCatValues;
          //get product family picklist
          @wire(getPicklistValues, {
            recordTypeId: "$objectInfo.data.defaultRecordTypeId",
            fieldApiName: PROD_FAM
          })
          pfValues;

          //handle enter key tagged. maybe change to this.searhKey === undefined
          handleKeys(evt){
            let eventKey = evt.keyCode === 13;
              if(eventKey){
                  console.log('enter')
                  this.search();  
              }
            }
            
            handleSearch(evt){
                evt.preventDefault(); 
                this.search(); 
            }

        async search(){
                
                this.stock = this.template.querySelector('[data-value="searchInput"]').value.trim().toLowerCase().match(REGEX_STOCK_RES); 
                this.searchTerm = this.template.querySelector('[data-value="searchInput"]').value.toLowerCase().replace(REGEX_SOSL_RESERVED,'?').replace(REGEX_STOCK_RES,'').trim();
                if(this.searchTerm.length<3){
                    //add lwc alert here
                    return;
                }
                this.loaded = false; 

                if(this.stock){
                    this.stock = spellCheck(this.stock[0])
                    this.searchQuery = cpqSearchString(this.searchTerm, this.stock);   
                }else{
                    this.searchQuery = cpqSearchString(this.searchTerm, this.stock); 
                }
                console.log(this.searchQuery);
                
                let data = await searchTag({searchKey: this.searchQuery}) 
                console.log(data)
                this.prod = await data.map(item =>({
                                    ...item, 
                                    rowVariant: item.Product__r.Temp_Unavailable__c ? 'border-filled' : 'brand',
                                    rowName: item.Product__r.Temp_Unavailable__c ? 'action:freeze_user' : 'action:new',
                                    rowValue: item.Product__r.Temp_Unavailable__c ? 'unavailable' :'Add',
                                    Name: item.Product__r.Temp_Unavailable__c ? item.Product_Name__c + ' - ' +item.Product__r.Temp_Mess__c : item.Product_Name__c,  
                                    ProductCode: item.Product_Code__c,
                                    Status: item.Stock_Status__c,
                                    Floor_Price__c: item.Floor_Price__c,
                                    Floor: item.Product__r.Floor_Type__c,
                                    qtyOnHand: item.Product__r.Total_Product_Items__c
                }))
                this.loaded = true;
                this.error = undefined;
            }
//Handle sort features
          handleSortdata(event) {
            // field name
            this.sortBy = event.detail.fieldName;
        
            // sort direction
            this.sortDirection = event.detail.sortDirection;
        
            // calling sortdata function to sort the data based on direction and selected field
            this.sortData(event.detail.fieldName, event.detail.sortDirection);
        }
        
        sortData(fieldname, direction) {
            // serialize the data before calling sort function
            let parseData = JSON.parse(JSON.stringify(this.prod));
        
            // Return the value stored in the field
            let keyValue = (a) => {
                return a[fieldname];
            };
        
            // cheking reverse direction 
            let isReverse = direction === 'asc' ? 1: -1;
        
            // sorting data 
            parseData.sort((x, y) => {
                x = keyValue(x) ? keyValue(x) : ''; // handling null values
                y = keyValue(y) ? keyValue(y) : '';
        
                // sorting values based on direction
                return isReverse * ((x > y) - (y > x));
            });
        
            // set the sorted data to data table data
            this.prod = parseData;
        
        }
}