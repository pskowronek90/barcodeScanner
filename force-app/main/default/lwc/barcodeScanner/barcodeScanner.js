import Id from '@salesforce/user/Id';
import { getFieldValue, getRecord } from 'lightning/uiRecordApi';
import { updateRecord } from "lightning/uiRecordApi";
import { LightningElement, api, wire, track } from 'lwc';
import { getBarcodeScanner } from 'lightning/mobileCapabilities';
import { ShowToastEvent } from 'lightning/platformShowToastEvent';
import NAME_FIELD from '@salesforce/schema/User.Name';
import EMAIL_FIELD from '@salesforce/schema/User.Email';
import VOUCHER_ID from '@salesforce/schema/Voucher__c.Id'
import VOUCHER_NAME from '@salesforce/schema/Voucher__c.Name'
import VOUCHER_ACCOUNT from '@salesforce/schema/Voucher__c.Account__r.Name'
import VOUCHER_SCAN_DATE from '@salesforce/schema/Voucher__c.ScanDate__c'
import VOUCHER_CONFIRMED_BY from '@salesforce/schema/Voucher__c.ConfirmedBy__c'
import VOUCHER_SECRET_CODE from '@salesforce/schema/Voucher__c.SecretCode__c'

export default class BarcodeScanner extends LightningElement {
    @api recordId;
    
    userId = Id;
    userName = '';
    userEmail = ''
    
    voucherId = '';
    voucherName = '';
    voucherAccount = '';
    scanDate = ''
    secretCode = ''
    
    connectedCallback() {
        this.myScanner = getBarcodeScanner(); 
    }

    // User data
    @wire(getRecord, { recordId: Id, fields: [NAME_FIELD, EMAIL_FIELD]})
    userDetails({error, data}) {
        if (data) {
            this.userName = data.fields.Name.value;
            this.userEmail = data.fields.Email.value;
        } else if (error) {
            this.error = error ;
        }
    }

    // Voucher data
    @wire(getRecord, {recordId: '$voucherId', fields: [VOUCHER_NAME, VOUCHER_ACCOUNT, VOUCHER_SCAN_DATE, VOUCHER_SECRET_CODE]})
    getVoucherData({data, error}) {
        if (data) {
            this.voucherName = getFieldValue(data, VOUCHER_NAME);
            this.voucherAccount = getFieldValue(data, VOUCHER_ACCOUNT);
            this.secretCode = getFieldValue(data, VOUCHER_SECRET_CODE);

            var scanDateCheck = getFieldValue(data, VOUCHER_SCAN_DATE);
            
            if (scanDateCheck == '' || scanDateCheck == null) {
                this.template.querySelector(".verify").style="display: block;";
            } else {
                this.scanDate = scanDateCheck.toString();
                this.showToast('Uwaga', 'Kod został już odebrany', 'warning');
            }
        } else if (error) {
            this.showToast('Błąd', 'Nie znaleziono vouchera', 'error');
        }
    }
    
    /**
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
                this.voucherId = result.value
            }).catch((error) => { 
                this.showToast('Błąd', error, 'error');
            }).finally(() => {
                this.myScanner.endCapture();
            }); 
        } 
        else {
            this.showToast('Błąd', 'To urządzenie nie wspiera skanowania', 'error');
        }
    }

    verifySecretCodeClick(event) {
        var secretCodeInput = this.template.querySelector(".verification-code").value;
        
        if (secretCodeInput != null && secretCodeInput != '') {
            if (secretCodeInput == this.secretCode) {
                this.updateVoucher();
                this.showToast('Weryfikacja pomyślna', 'Tożsamość potwierdzona', 'success');

                this.template.querySelector(".verify").style="visibility: hidden;";
            } else {
                this.showToast('Weryfikacja nieudana', 'Kod nieprawidłowy', 'error');
            }
        } else {
            this.showToast("Uwaga", 'Uzupełnij pole z kodem', 'info');
        }
    }

    showToast(title, message, variant) {
        const event = new ShowToastEvent({
            title: title,
            message: message,
            variant: variant,
            mode: 'dismissable'
        });
        this.dispatchEvent(event);
    }

    /**
     * Separate method to perform status od CodeScanned for currently logged-in User.
     */
    updateVoucher() {
        const fields = {};

        fields[VOUCHER_ID.fieldApiName] = this.voucherId;
        fields[VOUCHER_SCAN_DATE.fieldApiName] = this.generateTimeStamp();
        fields[VOUCHER_CONFIRMED_BY.fieldApiName] = this.userId;

        const recordInput = {
            fields: fields
        };

        updateRecord(recordInput);
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
}