import Id from '@salesforce/user/Id';
import { getFieldValue, getRecord } from 'lightning/uiRecordApi';
import { updateRecord } from "lightning/uiRecordApi";
import { LightningElement, api, wire, track } from 'lwc';
import { getBarcodeScanner } from 'lightning/mobileCapabilities';
import { ShowToastEvent } from 'lightning/platformShowToastEvent';
import ID_FIELD from '@salesforce/schema/User.Id';
import NAME_FIELD from '@salesforce/schema/User.Name';
import EMAIL_FIELD from '@salesforce/schema/User.Email';
import VOUCHER_ID from '@salesforce/schema/Voucher__c.Id'
import VOUCHER_ACCOUNT from '@salesforce/schema/Voucher__c.Account__r.Name'
import VOUCHER_SCAN_DATE from '@salesforce/schema/Voucher__c.ScanDate__c'

export default class Barcode_api_demo extends LightningElement {
    userId = Id;
    userName = '';
    userEmail = ''
    
    @track voucherId = '';
    @track voucherAccount = '';
    @track scanDate = ''
    
    connectedCallback() {
        this.myScanner = getBarcodeScanner(); 
    }

    @wire(getRecord, { recordId: Id, fields: [NAME_FIELD, EMAIL_FIELD]})
    userDetails({error, data}) {
        if (data) {
            this.userName = data.fields.Name.value;
            this.userEmail = data.fields.Email.value;
        } else if (error) {
            this.error = error ;
        }
    }
    
    async handleBarcodeClick(event){ 
        if(this.myScanner.isAvailable()) {
            const scanningOptions = {
                barcodeTypes: [this.myScanner.barcodeTypes.QR],
                instructionText: 'Skanuj kod QR',
                successText: 'Skanowanie zakończone.'
            };

            this.myScanner.beginCapture(scanningOptions)
            .then((result) => { 
                this.voucherId = result.value
                this.voucherAccount = this.getVoucherAccount();
                this.scanDate = this.getVoucherScanDate();

                
                // updateVoucher(); temporary disabled
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
        var timeStamp = new Date();
        var current = timeStamp.toLocaleString();

        return current;
    }

    splitVoucher(code) {
        var voucher = code.split(";");

        return voucher;
    }

    @wire(getRecord, {recordId: '$voucherId', fields: [VOUCHER_ACCOUNT, VOUCHER_SCAN_DATE]}) record;
        getVoucherAccount() {
            return this.record.data ? getFieldValue(this.record.data, VOUCHER_ACCOUNT) : '?';
        }

        getVoucherScanDate() {
            return this.record.data ? getFieldValue(this.record.data, VOUCHER_SCAN_DATE) : '?';
        }

    /**
     * Separate method to perform status od CodeScanned for currently logged-in User.
     */
    updateVoucher() {
        const fields = {};

        fields[VOUCHER_ID.fieldApiName] = this.voucherId;
        fields[VOUCHER_SCAN_DATE.fieldApiName] = this.generateTimeStamp();

        const recordInput = {
            fields: fields
        };

        updateRecord(recordInput);
    }
}