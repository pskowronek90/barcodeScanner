import Id from '@salesforce/user/Id';
import { getRecord } from 'lightning/uiRecordApi';
import { updateRecord } from "lightning/uiRecordApi";
import { LightningElement, wire } from 'lwc';
import { getBarcodeScanner } from 'lightning/mobileCapabilities';
import { ShowToastEvent } from 'lightning/platformShowToastEvent';
import ID_FIELD from '@salesforce/schema/User.Id';
import NAME_FIELD from '@salesforce/schema/User.Name';
import EMAIL_FIELD from '@salesforce/schema/User.Email';
import CODE_SCANNED_FIELD from '@salesforce/schema/User.CodeScanned__c';


export default class Barcode_api_demo extends LightningElement {
    userId = Id;
    userName = '';
    userEmail = ''
    codeScanned = ''
    status = '';
    
    connectedCallback() {
        this.myScanner = getBarcodeScanner(); 
    }

    @wire(getRecord, { recordId: Id, fields: [NAME_FIELD, EMAIL_FIELD, CODE_SCANNED_FIELD ]})
    userDetails({error, data}) {
        if (data) {
            this.userName = data.fields.Name.value;
            this.userEmail = data.fields.Email.value;
            this.codeScanned = data.fields.CodeScanned__c.value;
        } else if (error) {
            this.error = error ;
        }
    }

    /**
     * Method executed on click of Barcode scan button
     * @param event 
     */
    handleBarcodeClick(event){ 
        if(this.myScanner.isAvailable()) {
            const scanningOptions = {
                barcodeTypes: [this.myScanner.barcodeTypes.QR],
                instructionText: 'Skanuj kod QR',
                successText: 'Skanowanie zakończone.'
            }; 
            this.myScanner.beginCapture(scanningOptions)
            .then((result) => { 
                var statusCheck = this.codeScanned;

                if (statusCheck != null) {
                    this.template.querySelector(".statusCheck").style="color:red";
                    this.status = 'Kod zeskanowano ' + statusCheck;
                } else {
                    this.updateCurrentUser();
                        
                    this.template.querySelector(".statusCheck").style="color:green";
                    this.status = 'OK';
                } 
            }).catch((error) => { 
                this.showError('error',error);
            }).finally(() => {
                this.myScanner.endCapture();
            }); 
        }
        else {
            this.showError('Błąd','To urządzenie nie wspiera skanowania');
        }
    }

    /**
     * Utility method to show error message
     * @param  title 
     * @param  msg 
     */
    showError(title,msg) {
        const event = new ShowToastEvent({
            title: title,
            message: msg,
            error : 'error'
        });
        this.dispatchEvent(event);
    }

    /**
     * 
     * Helper function to get current date
     */
    generateTimeStamp() {
        var today = new Date();
        var dd = String(today.getDate()).padStart(2, '0');
        var mm = String(today.getMonth() + 1).padStart(2, '0'); //January is 0!
        var yyyy = today.getFullYear();

        today = mm + '/' + dd + '/' + yyyy;
        return today;
    }

    /**
     * Separate method to perform status od CodeScanned for currently logged-in User.
     */
    updateCurrentUser() {
        const fields = {};

        fields[ID_FIELD.fieldApiName] = Id;
        fields[CODE_SCANNED_FIELD.fieldApiName] = this.generateTimeStamp();

        const recordInput = {
            fields: fields
        };

        updateRecord(recordInput);
    }
}