//Bit of a confusing name. 
//Tags are a junction object between Search_Label__c and Product2
import { LightningElement, api, wire, track } from 'lwc';
import { FlowNavigationBackEvent, FlowNavigationNextEvent, FlowAttributeChangeEvent   } from 'lightning/flowSupport';
import LightningAlert from 'lightning/alert';
import findLabels from '@salesforce/apex/searchLabels.findLabels';
const REGEX_SOSL_RESERVED = /(\?|&|\||!|\{|\}|\[|\]|\(|\)|\^|~|\*|:|"|\+|\\)/g;
const SEARCH_DELAY = 400; 
export default class AddTags extends LightningElement{
    @api tagpills = [];
    //back to flow
    @api searchLableList = [];
    @track  results = [];
    //display pills
    @track selPills = [];
    showResult = false; 
    error;
    queryTerm
    loading; 
    //SEARCH VARS
    minSearchTerm = 3;
    searchTimeOut;
    productName;
    prodsId;
    labelName;
//GET LABELS
@wire(findLabels,{queryTerm:'$queryTerm'})
wiredList(result){
    if(result.data){
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
           
           
            this.searchTimeOut = null
        }, SEARCH_DELAY)
    }
     //item selected from dropdown
     itemSelect(evt){
        this.showResult = false;
        this.labelName = evt.target.value;
        this.prodsId = evt.currentTarget.dataset.recordid
        this.selPills = [...this.selPills,{
            label: this.labelName,
            name: this.labelName,
            Id: this.prodsId
        }]

        this.template.querySelector('lightning-input[data-my-id=in4]').value = '';
        //this.labelName = '';
    }
    handleItemRemove(event) {
        const name = event.detail.item.name;
        alert(name + ' pill was removed!');
        const index = event.detail.index;
        this.selPills.splice(index, 1);
    }

    async capturePills(){
        if(this.selPills === undefined || this.selPills.length < 1){
            await LightningAlert.open({
                message: 'Please select at least one tag',
                theme: 'error', // a red theme intended for error states
                label: 'Error!', // this is the header text
            });
            return; 
        }
        const lableIds = new Set(); 
        for(let i = 0; i < this.selPills.length; i++){
            lableIds.add(this.selPills[i].Id);
        }
        const out = [...lableIds]
        const attributeChange = new FlowAttributeChangeEvent('searchLableList', out);
        this.dispatchEvent(attributeChange); 
        this.goNext()
    }
    goNext(){
        console.log('next')
        const moveNext = new FlowNavigationNextEvent();
        this.dispatchEvent(moveNext);
    }

    get getListBoxClass(){
        return 'slds-listbox slds-listbox_vertical slds-dropdown slds-dropdown_fluid';
    }
}