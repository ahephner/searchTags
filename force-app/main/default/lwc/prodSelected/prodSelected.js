//Goes with prodSeach!!!!!
//has to be a way to call apex on the new products selected here
import { LightningElement, api, wire, track } from 'lwc';
import getLastPaid from '@salesforce/apex/cpqApex.getLastPaid';
import selectedProducts from '@salesforce/apex/quickPriceSearch.selectedProducts';  
import getProducts from '@salesforce/apex/cpqApex.getProducts';
import getInventory from '@salesforce/apex/cpqApex.getInventory';
import getLastQuote from '@salesforce/apex/cpqApex.getLastQuote';
import onLoadGetInventory from '@salesforce/apex/cpqApex.onLoadGetInventory';
import onLoadGetLastPaid from '@salesforce/apex/cpqApex.onLoadGetLastPaid';
import onLoadGetLevels from '@salesforce/apex/cpqApex.getLevelPricing';
import onLoadGetLastQuoted from '@salesforce/apex/cpqApex.onLoadGetLastQuoted';
import inCounts from '@salesforce/apex/cpqApex.inCounts';
import { refreshApex } from '@salesforce/apex';
import { ShowToastEvent } from 'lightning/platformShowToastEvent';
import { APPLICATION_SCOPE,MessageContext, publish, subscribe,  unsubscribe} from 'lightning/messageService';
import Opportunity_Builder from '@salesforce/messageChannel/Opportunity_Builder__c';
import createProducts from '@salesforce/apex/cpqApex.createProducts';
import {getRecord, getFieldValue, updateRecord, getRecordNotifyChange } from 'lightning/uiRecordApi';
import { deleteRecord} from 'lightning/uiRecordApi';
import ACC from '@salesforce/schema/Opportunity.AccountId';
import STAGE from '@salesforce/schema/Opportunity.StageName';
import PRICE_BOOK from '@salesforce/schema/Opportunity.Pricebook2Id'; 
import WAREHOUSE from '@salesforce/schema/Opportunity.Warehouse__c';
import DELIVERYDATE from '@salesforce/schema/Opportunity.Delivery_Date_s_Requested__c';
import ID_FIELD from '@salesforce/schema/Opportunity.Id';
import SHIPADD  from '@salesforce/schema/Opportunity.Shipping_Address__c'
import SHIPCHARGE from '@salesforce/schema/Opportunity.Shipping_Total__c';
import SHIPTYPE from '@salesforce/schema/Opportunity.Ship_Type__c';
import {mergeInv,mergeLastPaid, lineTotal, onLoadProducts , newInventory,updateNewProducts, getTotals, getCost,roundNum, allInventory, checkPricing ,getShipping, getManLines, setMargin, mergeLastQuote} from 'c/helper'

const FIELDS = [ACC, STAGE, WAREHOUSE];
export default class ProdSelected extends LightningElement {
    @api recordId; 
    pbeId; 
    productId; 
    productCode;
    pbId;
    singleProduct; 
    unitCost;
    unitWeight;
    fPrice; 
    levelOne;
    levelOneMargin; 
    levelTwo;
    levelTwoMargin;
    companyLastPaid;  
    agency;
    sId; 
    productName; 
    prodFound = false
    accountId;
    deliveryDate; 
    shipType;
    dropShip;  
    stage;
    warehouse;
    shippingAddress;
    invCount;
    lastQuote
    error;
    goodPricing = true;   
    hasRendered = true;
    unsavedProducts = false; 
    wasSubmitted; 
    loaded = true;
    goodQty; 
    tPrice = 0.00;
    countOfBadPrice = 0; 
    //shpWeight;
    tQty=0;
    tMargin = 0;
    tCost = 0;
    //hide margin col if non rep is close!
    pryingEyes = false
    numbOfManLine = 0
    @track selection = []
//for message service
    subscritption = null;

    @wire(MessageContext)
    messageContext;
    // Standard lifecycle hooks used to subscribe and unsubsubscribe to the message channel
    connectedCallback() {
        this.subscribeToMessageChannel();
        this.loadProducts(); 
        
    }
    renderedCallback(){
        if(this.selection.length>0 && this.hasRendered){
            this.initPriceCheck();
        }
        
    }
    disconnectedCallback() {
        this.unsubscribeToMessageChannel();
    }
    //subscribe to channel
    subscribeToMessageChannel(){
        
        if(!this.subscritption){
            this.subscritption = subscribe(
                this.messageContext,
                Opportunity_Builder,
                (message) => this.handleMessage(message),
                {scope:APPLICATION_SCOPE}
            );
        }
    }
    
    handleMessage(mess){
        if(mess.shipAddress){
            //console.log('shipping address');
            
            this.shippingAddress = mess.shipAddress;
        }else{
            //console.log('new product');
            
            this.productCode = mess.productCode;
            let alreadyThere = this.selection.findIndex(prod => prod.ProductCode === this.productCode);
            
            //check if the product is already on the bill. Can't have duplicates
            if(alreadyThere<0){
                this.productName = mess.productName;
                this.productId = mess.productId 
                this.pbeId = mess.pbeId;
                this.unitCost = mess.unitCost
                this.unitWeight = mess.prodWeight;
                this.agency = mess.agencyProduct;
                this.fPrice = mess.floorPrice;
                this.levelOne = mess.levelOnePrice;
                this.levelOneMargin = mess.levelOneMargin;
                this.levelTwo = mess.levelTwoPrice;  
                this.levelTwoMargin = mess.levelTwoMargin; 
                this.companyLastPaid = mess.lastPaid
                this.handleNewProd(); 
                this.prodFound = true;
             }        
            }
        
    }

    //fired from search check if the product is already on the order if not set the id and call the function to load it's info.  
   handleTagProduct(mess){
        let selectedPC = mess.detail[1]
        let alreadyThere = this.selection.findIndex(prod => prod.ProductCode === selectedPC);
        if(alreadyThere<0){
            this.productId = mess.detail[0]
            this.handleNewProd();  
        }
    }

    unsubscribeToMessageChannel() {
        unsubscribe(this.subscription);
        this.subscription = null;
    }
//get record values
    @wire(getRecord, {recordId: '$recordId', fields:[ACC, STAGE, PRICE_BOOK, WAREHOUSE, SHIPADD, DELIVERYDATE, SHIPTYPE]})
        loadFields({data, error}){
            if(data){
                this.accountId = getFieldValue(data, ACC);
                this.stage = getFieldValue(data, STAGE);
                this.pbId = getFieldValue(data, PRICE_BOOK); 
                this.warehouse = getFieldValue(data, WAREHOUSE); 
                this.shippingAddress  = getFieldValue(data, SHIPADD);
                this.deliveryDate = getFieldValue(data, DELIVERYDATE); 
                this.shipType = getFieldValue(data, SHIPTYPE);  
                this.dropShip = this.shipType === 'DS' ? true : false; 
                this.wasSubmitted = this.stage === 'Closed Won'? true : false;
                //console.log('ship type '+this.shipType)
            }else if(error){
                console.log('error '+JSON.stringify(error));
                
            }
        }
        setFieldValues(mess){
            this.productName = mess.Product2.Name;
            this.productId = mess.Product2Id; 
            this.pbeId = mess.Id;
            this.unitCost = mess.Product_Cost__c;
            this.unitWeight = mess.Product2.Ship_Weight__c;
            this.agency = mess.Agency_Product__c;
            this.fPrice = mess.Floor_Price__c;
            this.levelOne = mess.Level_1_UserView__c;
            this.levelOneMargin = mess.Level_1_Margin__c;
            this.levelTwo = mess.Level_2_UserView__c;  
            this.levelTwoMargin = mess.Level_2_Margin__c; 
            this.companyLastPaid = mess.Product2.Last_Purchase_Price__c;  
            this.prodFound = true;
        }
    async handleNewProd(){
        //get last paid only works on new adding product
        let totalPrice;
        let totalQty; 
        let data1 = await selectedProducts({productIds: this.productId, priceBookId: this.pbId})
        this.setFieldValues(data1); 
        this.newProd = await getLastPaid({accountID: this.accountId, Code: this.productCode});
        this.invCount = await getInventory({locId: this.warehouse, pId: this.productId });
        this.lastQuote = await getLastQuote({accountID: this.accountId, Code: this.productCode, opportunityId:this.recordId});
        console.log('lq '+JSON.stringify(this.lastQuote))
        if(this.newProd != null){

            this.selection = [
                ...this.selection, {
                    sObjectType: 'OpportunityLineItem',
                    Id: '',
                    PricebookEntryId: this.pbeId,
                    Product2Id: this.productId,
                    agency: this.agency,
                    name: this.productName,
                    ProductCode: this.productCode,
                    Ship_Weight__c: this.unitWeight,
                    Quantity: 1,
                    UnitPrice: this.agency ? this.fPrice: this.levelTwo,
                    floorPrice: this.fPrice,
                    lOne: this.agency? this.fPrice : this.levelOne,
                    lTwo: this.levelTwo, 
                    CPQ_Margin__c: this.agency?'':this.levelTwoMargin,
                    Cost__c: this.unitCost,
                    displayCost: this.agency ? 'Agency' : this.unitCost,
                    lastPaid: !this.newProd ? 0 : this.newProd.Unit_Price__c,
                    lastMarg: this.agency ? '' : (this.newProd.Margin__c / 100),
                    docDate: this.newProd.Doc_Date__c,
                    TotalPrice: this.agency? this.fPrice : this.levelTwo,
                    wInv:  !this.invCount ? 0 :this.invCount.Quantity_Available__c,
                    showLastPaid: true,
                    lastQuoteAmount: !this.lastQuote ? 0 : this.lastQuote.Last_Quote_Price__c,
                    lastQuoteMargin: !this.lastQuote ? 0 : this.lastQuote.Last_Quote_Margin__c,
                    lastQuoteDate: !this.lastQuote ? '' : this.lastQuote.Quote_Date__c,
                    flrText: 'flr price $'+ this.fPrice,
                    lOneText: 'lev 1 $'+this.levelOne,
                    companyLastPaid: this.companyLastPaid,
                    //tips: this.agency ? 'Agency' : 'Cost: $'+this.unitCost +' Company Last Paid: $' +this.companyLastPaid + ' Code ' +this.productCode,
                    goodPrice: true,
                    manLine: this.productCode === 'MANUAL CHARGE' ? true : false,
                    OpportunityId: this.recordId
                }
            ]
            
        }else{
            this.selection = [
                ...this.selection, {
                    sObjectType: 'OpportunityLineItem',
                    PricebookEntryId: this.pbeId,
                    Id: '',
                    Product2Id: this.productId,
                    agency: this.agency,
                    name: this.productName,
                    ProductCode: this.productCode,
                    Ship_Weight__c: this.unitWeight,
                    Quantity: 1,
                    UnitPrice: this.agency ? this.fPrice: this.levelTwo,
                    floorPrice: this.fPrice,
                    lOne: this.agency? this.fPrice : this.levelOne,
                    lTwo: this.levelTwo,
                    lastPaid: 0,
                    lastMarg: 0, 
                    docDate: 'First Purchase', 
                    CPQ_Margin__c: this.agency?'':this.levelTwoMargin,
                    Cost__c: this.unitCost,
                    displayCost: this.agency ? 'Agency' : this.unitCost,
                    TotalPrice: this.agency? this.fPrice : this.levelTwo,
                    wInv: !this.invCount ? 0 :this.invCount.Quantity_Available__c,
                    showLastPaid: true,
                    lastQuoteAmount: !this.lastQuote ? 0 : this.lastQuote.Last_Quote_Price__c,
                    lastQuoteMargin: !this.lastQuote ? 0 : this.lastQuote.Last_Quote_Margin__c,
                    lastQuoteDate: !this.lastQuote ? '' : this.lastQuote.Quote_Date__c,
                    flrText: 'flr price $'+ this.fPrice,
                    lOneText: 'lev 1 $'+this.levelOne, 
                    companyLastPaid: this.companyLastPaid,
                    //tips: this.agency ? 'Agency' : 'Cost: $'+this.unitCost +' Company Last Paid $' +this.companyLastPaid + ' Code ' +this.productCode,
                    goodPrice: true,
                    manLine: this.productCode === 'MANUAL CHARGE' ? true : false,
                    OpportunityId: this.recordId
                }
            ]
        }    
            //console.log(JSON.stringify(this.selection));
            let totals =  getTotals(this.selection);
            this.tPrice = totals.TotalPrice;
            this.tQty = totals.Quantity;
            this.tCost = getCost(this.selection) 
            if(!this.agency){
                let margin = setMargin(this.tCost, this.tPrice)
                this.tMargin = roundNum(margin, 2);
            }
            this.unsavedProducts = true; 
    }

    addManualLine(){
        this.numbOfManLine ++;
        if(this.numbOfManLine<10){ 

        this.selection = [
            ...this.selection, {
                sObjectType: 'OpportunityLineItem',
                //have to get hard coded id
                PricebookEntryId: '01u75000004xmuzAAA',
                Id: '',
                Product2Id: '01t75000000bV2aAAE',
                agency: false,
                name: 'Manual Line.'+this.numbOfManLine,
                ProductCode: 'Manual Line.'+this.numbOfManLine,
                Ship_Weight__c: 0,
                Quantity: 1,
                UnitPrice: 0,
                floorPrice: 0,
                lOne: 0,
                lTwo: 0,
                lastPaid: 0,
                lastMarg: 0, 
                docDate: 'First Purchase', 
                CPQ_Margin__c: 0,
                Cost__c: 1,
                TotalPrice: 0,
                wInv: 0,
                showLastPaid: true,
                flrText: 'flr price $',
                lOneText: 'lev 1 $', 
                tips: 'manual line',
                goodPrice: true,
                manLine: true,
                OpportunityId: this.recordId
            }
        ]
        this.unsavedProducts = true; 
        }else{
            alert('can only have 9 man lines')
        }
        console.log(this.selection)
    }

    //If a user decides to uncheck a product on the search screen
    handleRemove(y){
        console.log('handleRemove');
        let index = this.selection.findIndex(prod => prod.PricebookEntryId === y.detail);
        
        if(index > -1){
            this.selection.splice(index, 1);
        }else{
            return; 
        }   
    }

    //Handle Pricing change here
    newPrice(e){
        window.clearTimeout(this.delay);
        let index = this.selection.findIndex(prod => prod.ProductCode === e.target.name)
        //let targetId = this.selection.find(ele => ele.ProductCode === e.target.name);
        let targetId = e.target.name; 
        
        
        this.delay = setTimeout(()=>{
            this.selection[index].UnitPrice = e.detail.value;
            this.selection[index].UnitPrice = Number(this.selection[index].UnitPrice);
            
            if(this.selection[index].UnitPrice > 0){
                this.selection[index].CPQ_Margin__c = Number((1 - (this.selection[index].Cost__c /this.selection[index].UnitPrice))*100).toFixed(2)
                this.selection[index].TotalPrice = (this.selection[index].Quantity * this.selection[index].UnitPrice).toFixed(2);    

            }
            //Alert the user if the pricing is good. If an item is below floor don't allow a save. Could push that item to special order
            let lOne = Number(this.selection[index].lOne);
            let floor = Number(this.selection[index].floorPrice);
            let unitp = Number(this.selection[index].UnitPrice);
            this.handleWarning(targetId,lOne, floor, unitp, index)
            let totals =  getTotals(this.selection);
            this.tPrice = roundNum(totals.TotalPrice, 2);
            if(!this.selection[index].agency){
                let margin = setMargin(this.tCost, this.tPrice)
                this.tMargin = roundNum(margin, 2);
            }

        }, 1000)
        this.unsavedProducts = true;
    }
    

    newMargin(m){
        window.clearTimeout(this.delay)
        let index = this.selection.findIndex(prod => prod.ProductCode === m.target.name)
        let targetId = m.target.name; 
        
        // eslint-disable-next-line @lwc/lwc/no-async-operation
        this.delay = setTimeout(()=>{
                this.selection[index].CPQ_Margin__c = Number(m.detail.value);
                
                if(1- this.selection[index].CPQ_Margin__c/100 > 0){
                    this.selection[index].UnitPrice = Number(this.selection[index].Cost__c /(1- this.selection[index].CPQ_Margin__c/100)).toFixed(2);
                    
                    this.selection[index].TotalPrice = Number(this.selection[index].Units_Required__c * this.selection[index].UnitPrice).toFixed(2)
                    this.selection[index].TotalPrice = lineTotal(this.selection[index].Quantity, this.selection[index].UnitPrice);                
                }else{
                    this.selection[index].UnitPrice = 0;
                    this.selection[index].UnitPrice = this.selection[index].UnitPrice.toFixed(2);
                    this.selection[index].TotalPrice = Number(this.selection[index].Units_Required__c * this.selection[index].UnitPrice).toFixed(2)   
                 
                }
                //Alert the user if the pricing is good. If an item is below floor don't allow a save. Could push that item to special order
            let lOne = Number(this.selection[index].lOne);
            let floor = Number(this.selection[index].floorPrice);
            let unitp =  Number(this.selection[index].UnitPrice);
            this.handleWarning(targetId,lOne, floor, unitp, index);
            //update order totals
            let totals =  getTotals(this.selection);
            this.tPrice = roundNum(totals.TotalPrice, 2)
            if(!this.selection[index].agency){
                let margin = setMargin(this.tCost, this.tPrice)
                this.tMargin = roundNum(margin, 2);
            }
    },1000)
    this.unsavedProducts = true; 
    }
    
    newQTY(e){
        // if(e.detail.value % 1 != 0){
        //     this.goodQty = false; 
        //     return
        // }
        let index = this.selection.findIndex(prod => prod.ProductCode === e.target.name)
        
        this.selection[index].Quantity = Number(e.detail.value);
 //need to figure out how not run on zeroed out qty. 
        if(this.selection[index].UnitPrice >0 && this.selection[index].Quantity > 0){
            this.selection[index].TotalPrice = roundNum(this.selection[index].Quantity * this.selection[index].UnitPrice, 2) 
            this.goodQty = true;   
        }
        let totals =  getTotals(this.selection);
//handle warning lights if qty is higher than avaliable
        let want = Number(this.selection[index].Quantity);
        let aval = Number(this.selection[index].wInv)
        this.qtyWarning(e.target.name, want,aval)

//round total price and qty set margin
        this.tPrice = roundNum(totals.TotalPrice, 2)
        //this.shpWeight = totals.Ship_Weight__c;
        this.tQty = totals.Quantity;
        this.tCost = getCost(this.selection)
        this.unsavedProducts = true; 
        if(!this.selection[index].agency){
            let margin = setMargin(this.tCost, this.tPrice)
            this.tMargin = roundNum(margin, 2);
        }

    }
    newComment(x){
        let index = this.selection.findIndex(prod => prod.ProductCode === x.target.name);
        this.selection[index].Description = x.detail.value; 
        this.unsavedProducts = true;    
    }
    
    removeProd(x){
        let index = this.selection.findIndex(prod => prod.ProductCode === x.target.name)
        let id = this.selection[index].Id; 
        
        if(index >= 0){
            let cf = confirm('Do you want to remove this entry?')
            if(cf ===true){
                this.selection.splice(index, 1);
                if(id){
                    console.log('deleting prod');
                    
                    deleteRecord(id); 
                }
                //update order totals
                let totals =  getTotals(this.selection);
            
                this.tPrice = totals.TotalPrice;
                //this.shpWeight = totals.Ship_Weight__c;
                this.tQty = totals.Quantity;
                this.tCost = getCost(this.selection);  
                let margin = setMargin(this.tCost, this.tPrice)
                this.tMargin = roundNum(margin, 2);
                //check pricing
                this.goodPricing = checkPricing(this.selection);
            }
        }      
    }
    //get warehouse options
//these are hardcoded to full NEED TO GET DYNAMIC

    get warehouseOptions(){
        return [
            {label:'All', value:'All'},
            {label: '105 | Noblesville', value:'1312M000000PB0ZQAW'}, 
            {label:'115 | ATS Fishers', value:'1312M00000001nsQAA'},
            {label:'125 | ATS Lebanon (Parts)', value:'1312M00000001ntQAA'},
            {label:'200 | ATS Louisville', value:'1312M00000001nuQAA'},
            {label:'250 | ATS Florence', value:'1312M00000001nvQAA'},
            {label:'270 | ATS Winston-Salem', value:'1312M00000001nwQAA'},
            {label:'360 | ATS Nashville', value:'1312M00000001nxQAA'},
            {label:'400 | ATS Columbus', value:'1312M00000001nyQAA'},
            {label:'415 | ATS Sharonville', value:'1312M00000001nzQAA'},
            {label:'440 | ATS Lewis Center', value:'1312M00000001o0QAA'},
            {label:'450 | ATS Brecksville', value:'1312M00000001o1QAA'},
            {label:'470 | ATS Boardman', value:'1312M00000001o2QAA'},
            {label:'510 | ATS Travis City', value:'1312M00000001o3QAA'},
            {label:'520 | ATS Farmington Hills', value:'1312M00000001o4QAA'},
            {label:'600 | ATS - Elkhart', value:'1312M00000001o5QAA'},
            {label:'710 | ATS - St. Peters', value:'1312M00000001o6QAA'},
            {label:'720 | ATS - Cape Girardeau', value:'1312M00000001o7QAA'},
            {label:'730 | ATS - Columbia', value:'1312M00000001o8QAA'},
            {label:'770 | ATS - Riverside', value:'1312M00000001o9QAA'},
            {label:'820 | ATS - Wheeling', value:'1312M000000PB0UQAW'},
            {label:'850 | ATS - Madison', value:'1312M00000001oAQAQ'},
            {label:'860 | ATS - East Peoria', value:'13175000000Q1FeAAK'},
            {label:'960 | ATS - Monroeville', value:'1312M00000001oBQAQ'},
            {label:'980 | ATS - Ashland', value:'1312M00000001oCQAQ'}

        ];
    }

    //check other inventory
    async checkInventory(locId){
        this.warehouse = locId.detail.value; 
        this.loaded = false;
        let data = [...this.selection];
        let pcSet = new Set();
        let prodCodes = [];
        try{
            data.forEach(x=>{
                pcSet.add(x.ProductCode);
            })
            prodCodes = [...pcSet];

            let inCheck = await inCounts({pc:prodCodes, locId:this.warehouse});
            //console.log('inCheck ' +JSON.stringify(inCheck));
            this.selection = this.warehouse === 'All' ? await allInventory(data, inCheck) : await newInventory(data, inCheck);
            //this will cause rerender to run so we can update the warning colors. 
            this.hasRendered = true; 
            //console.log(JSON.stringify(this.selection)); 
        }catch(error){
            this.error = error;
            const evt = new ShowToastEvent({
                title: 'Error loading inventory',
                message: this.error,
                variant: 'warning'
            });
            this.dispatchEvent(evt);
        }finally{
            this.loaded = true;
        }    
    }

    // Save Products Only Not Submit
    saveProducts(){
        this.loaded = false; 
        const newProduct = this.selection.filter(x=>x.Id === '') 
        const alreadyThere = this.selection.filter(y=>y.Id != '')
        let shipTotal = this.selection.filter(y => y.ProductCode.includes('SHIPPING'));
        console.log('sending '+JSON.stringify(this.selection))
        //createProducts({newProds: newProduct, upProduct: alreadyThere, oppId: this.recordId})
        createProducts({olList: this.selection, oppId: this.recordId, accId: this.accountId})
        .then(result=>{
            //need to map over return values and save add in non opp line item info 
            let back = updateNewProducts(newProduct, result);
            
            this.selection =[...alreadyThere, ...back];
            
            //console.log(JSON.stringify(this.selection));
            
            this.dispatchEvent(
                new ShowToastEvent({
                    title: result,
                    message: 'Products Saved',
                    variant: 'success',
                }),
            );
            getRecordNotifyChange({recordId: this.recordId})
        }).then(()=>{
            if(shipTotal.length>0){
                console.log('saving shipping');
                let shipCharge = getShipping(shipTotal);
                
                const fields = {};
                fields[ID_FIELD.fieldApiName] = this.recordId;
                fields[SHIPCHARGE.fieldApiName] = shipCharge;
                const shipRec = {fields}
                updateRecord(shipRec)
            } 
         
        }).catch(error=>{
            
            let mess = JSON.stringify(error);;
            
            this.dispatchEvent(
                new ShowToastEvent({
                    title: 'Error Saving Products',
                    message:mess,
                    variant: 'error',
                }),
            );
        }).finally(()=>{
            this.unsavedProducts = false; 
            this.loaded = true; 
        })
    }

    moveStage(){
        this.loaded = false;
        createProducts({olList: this.selection})
        .then(result=>{
            if(this.shippingAddress != null || !this.shippingAddress){
                
                const fields = {};
                fields[ID_FIELD.fieldApiName] = this.recordId;
                fields[SHIPADD.fieldApiName] = this.shippingAddress;
                fields[ID_FIELD.fieldApiName] = this.recordId;
                fields[STAGE.fieldApiName] = 'Quote(45%)';
                const shipRec = {fields}
                updateRecord(shipRec)
            }else{
                const fields = {}
                fields[ID_FIELD.fieldApiName] = this.recordId;
                fields[STAGE.fieldApiName] = 'Quote(45%)';
                const opp = {fields};
                updateRecord(opp)  
            } 
        }) 
        .then(()=>{
            this.dispatchEvent(
                new ShowToastEvent({
                    title: 'Success',
                    message: 'Quote Updated',
                    variant: 'success'
                })
            );
            // Display fresh data in the form
            getRecordNotifyChange({recordId: this.recordId})
            this.unsavedProducts = false; 
            this.loaded = true; 
        }).catch(error=>{
            
            this.dispatchEvent(
                new ShowToastEvent({
                    title:'Error Updating Record',
                    message: error.body.message,
                    variant: 'error'
                })
            )
        })
        //Needed Winter 23
        // LightningAlert.open({
        //     message: 'not connected to anything. This is a new lwc alert!',
        //     //label defaults to "Alert"
        //     variant: 'headerless',
        // }).then((result) => {
        //     console.log('alert result', result);
        // });
    }

    saveSubmit(){
        this.loaded = false; 
        let valid = this.isValid();
        if(valid === 'no ship'){
            this.dispatchEvent(
                new ShowToastEvent({
                    title: 'Missing Shipping Address',
                    message: 'Please select a shipping address!',
                    variant: 'error',
                }),
            );
            this.loaded = true; 
            return; 
        }else if(valid === 'no delivery'){
            this.dispatchEvent(
                new ShowToastEvent({
                    title: 'Missing Delivery Date',
                    message: 'Please select on delivery date!',
                    variant: 'error',
                }),
            );
            this.loaded = true; 
            return; 
        }
        
        console.log('sending '+JSON.stringify(this.selection))
        createProducts({olList: this.selection})
        .then(result=>{
            const fields = {};
            fields[STAGE.fieldApiName] = 'Closed Won';
            fields[ID_FIELD.fieldApiName] = this.recordId;
            fields[SHIPADD.fieldApiName] = this.shippingAddress;
            //console.log('sa ' +JSON.stringify(fields));
            
            const recordInput = { fields };

            updateRecord(recordInput).then(() => {
                this.dispatchEvent(
                    new ShowToastEvent({
                        title: 'Success',
                        message: 'Opportunity Submitted',
                        variant: 'success'
                    })
                );
                // Display fresh data in the form
               // return refreshApex(this.contact);
            })
            this.unsavedProducts = false; 
        }).catch(error=>{
            console.log(JSON.stringify(error))
            let message = 'Unknown error';
            if (Array.isArray(error.body)) {
                message = error.body.map(e => e.message).join(', ');
            } else if (typeof error.body.message === 'string') {
                message = error.body.message;
            }
            this.dispatchEvent(
                new ShowToastEvent({
                    title: 'Error Saving Products',
                    message,
                    variant: 'error',
                }),
            );
        }).finally(()=>{
            this.loaded = true; 
        })
    }
    isValid(){
        let res = 'good';
        if(this.shippingAddress ===null || !this.shippingAddress){
            res = 'no ship';
         }else if(this.deliveryDate == null || !this.deliveryDate){
             res = 'no delivery'
        }
        return res; 
    }
    //on load get products
    //get last paid next
    async loadProducts(){
        //inventory vars
        let inSet = new Set();
        let prodIdInv = []; 
        let inCode = new Set();
        let codes = [];
        try{
            let results = await getProducts({oppId: this.recordId})
            if(!results){
                return; 
            }else if(results){

                results.forEach(item =>{
                    inSet.add(item.Product2Id);
                    inCode.add(item.Product2.ProductCode)
                });
                prodIdInv = [...inSet];
                
                codes = [...inCode]; 
            }
            //console.log('results '+JSON.stringify(results));
            
            let invenCheck = await onLoadGetInventory({locId: this.warehouse, pIds: prodIdInv});
            //console.log('invCheck '+JSON.stringify(invenCheck));
            
            //get last paid and last quote then merge together
            let lastPaid = await onLoadGetLastPaid({accountId: this.accountId, productCodes:codes})
            let lastQuote = await onLoadGetLastQuoted({accountId: this.accountId, productCodes: codes, opportunityId: this.recordId});

            let priceLevels = await onLoadGetLevels({priceBookId: this.pbId, productIds:prodIdInv})
            
            //MERGE the inventory and saved products. 
            let mergedInven = await mergeInv(results,invenCheck);
            if(lastQuote.length>0){
                console.log('running mergeLastQuote');
                mergedInven = await mergeLastQuote(mergedInven, lastQuote);
            }
            //merge last paid saved products
            let mergedLastPaid = await mergeLastPaid(mergedInven,lastPaid);            
            //MERGE the price levels and saved products
            let mergedLevels = await mergeInv(mergedLastPaid, priceLevels);
            
            
            //IF THERE IS A PROBLEM NEED TO HANDLE THAT STILL!!!
            this.selection = await onLoadProducts(mergedLevels, this.recordId); 
            //get the order totals; 
            let totals = await getTotals(this.selection);
            //set the number of manual lines on the order
            this.numbOfManLine = await getManLines(this.selection);
            this.tPrice = roundNum(totals.TotalPrice,2);
            //this.shpWeight = totals.Ship_Weight__c;
            this.tQty = totals.Quantity;
            this.tCost = await getCost(this.selection);  
            console.log('total cost '+this.tCost)
            let margin = setMargin(this.tCost, this.tPrice)
            this.tMargin = roundNum(margin, 2);
            
         }catch(error){
            let mess = error; 
            console.error('error ==> '+error);
            
            this.dispatchEvent(
                new ShowToastEvent({
                    title: 'Error loading products',
                    message: mess,
                    variant: 'error',
                }),
            );
            
        }finally{
            this.prodFound = true; 
        }

    }
///Warning Section. Checking if the price is too low or there is enough qty
    qtyWarning = (target, qty, aval)=>{
     ///console.log(1,target,2,qty,3,aval);
        
        let targ = this.template.querySelector(`[data-tar="${target}"]`)
        if(qty>aval){
            //targ.classList.toggle('color'); 
           this.template.querySelector(`[data-tar="${target}"]`).style.color = 'orange'; 
        }else if(qty<aval){
            this.template.querySelector(`[data-tar="${target}"]`).style.color = 'black';
            //targ.classList.toggle('color');
        }
        
    }
    //handles alerting the user if the pricing is good or bad 
    //the countOfBadPrice prevents if multiple products are too low if one product is fixed it wont allow save. 
    handleWarning = (targ, lev, flr, price, ind)=>{
        console.log(1,lev, 2, flr, 3, price);
        
        if(price > lev){
            this.template.querySelector(`[data-id="${targ}"]`).style.color ="black";
            this.template.querySelector(`[data-margin="${targ}"]`).style.color ="black";
            this.selection[ind].goodPrice = true; 
            this.goodPricing = checkPricing(this.selection);
           
        }else if(price<lev && price>=flr){
            this.template.querySelector(`[data-id="${targ}"]`).style.color ="orange";
            this.template.querySelector(`[data-margin="${targ}"]`).style.color ="orange";
            this.selection[ind].goodPrice = true;
            this.goodPricing = checkPricing(this.selection);
            
        }else if(price===lev && price>=flr){
            this.template.querySelector(`[data-id="${targ}"]`).style.color ="black";
            this.template.querySelector(`[data-margin="${targ}"]`).style.color ="black";
            this.selection[ind].goodPrice = true;
            this.goodPricing = checkPricing(this.selection);
            
        }else if(price<flr){
            this.template.querySelector(`[data-id="${targ}"]`).style.color ="red";
            this.template.querySelector(`[data-margin="${targ}"]`).style.color ="red";
            this.selection[ind].goodPrice = false;
            this.goodPricing = checkPricing(this.selection);
             
        }
    }
    //init will check pricing and render the color 
    //should only run on load. Then handleWarning function above runs because it only runs over the individual line
    //Important don't query UnitPrice on Opp Line Item. Otherwise it will think the cost is the same price. 
    initPriceCheck(){
        
        this.hasRendered = false; 
        
        
            for(let i=0; i<this.selection.length; i++){
                let target = this.selection[i].ProductCode
                let level = Number(this.selection[i].lOne);
                let floor = Number(this.selection[i].floorPrice);
                let price = Number(this.selection[i].UnitPrice);
                
                if(price>level){
                    //console.log('good to go '+this.selection[i].name);
                    this.template.querySelector(`[data-id="${target}"]`).style.color ="black";
                    this.template.querySelector(`[data-margin="${target}"]`).style.color ="black";
                }else if(price<level && price>=floor){
                    this.template.querySelector(`[data-id="${target}"]`).style.color ="orange";
                    this.template.querySelector(`[data-margin="${target}"]`).style.color ="orange";
                }else if(price === level && price>=floor){
                    this.template.querySelector(`[data-id="${target}"]`).style.color ="black";
                    this.template.querySelector(`[data-margin="${target}"]`).style.color ="black";
                }else if(price<floor){
                    this.template.querySelector(`[data-id="${target}"]`).style.color ="red";
                    this.template.querySelector(`[data-margin="${target}"]`).style.color ="red" 
                    this.goodPricing = false;
                }
            }
            //call inventory check
        this.initQtyCheck();    
    }
    initQtyCheck(){
        for(let i=0; i<this.selection.length; i++){
            let target = this.selection[i].ProductCode
            let qty = Number(this.selection[i].Quantity);
            let aval = Number(this.selection[i].wInv);
            if(qty>aval){
                this.template.querySelector(`[data-tar="${target}"]`).style.color = 'orange'; 
             }
        }
    }
    //Show floor vs last paid
    showValues(e){
        let index = this.selection.findIndex(prod => prod.ProductCode === e.target.dataset.targetId);
        
        if(this.selection[index].showLastPaid){
            console.log('turning false');
            
            this.selection[index].showLastPaid = false;
        }else{
            this.selection[index].showLastPaid = true; 
        }
    }
    hideMarge(){
        console.log('click ' +this.pryingEyes);
        
        this.pryingEyes = this.pryingEyes ? false : true; 
    }
    //open price book search
    openProdSearch(){
        this.template.querySelector('c-prod-search-tags').openPriceScreen(); 
    }
}