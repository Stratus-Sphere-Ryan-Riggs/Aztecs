/**
 * @NApiVersion 2.1
 * @NScriptType ClientScript
 */
define(['N/currentRecord', 'N/log', 'N/search'],
  function (currentRecord, log, search) {


    function fieldChanged(context) {
      try {
        var rec = currentRecord.get();
        var sublistId = context.sublistId;
        if (context.fieldId == 'custcol_hrc_cost_type') {
          var costCode = rec.getCurrentSublistText({
            fieldId: 'custcol_hrc_cost_code_',
            sublistId: sublistId,
          });
          var costCodeVal = rec.getCurrentSublistValue({
            fieldId: 'custcol_hrc_cost_code_',
            sublistId: sublistId,
          });
          var costType = rec.getCurrentSublistValue({
            fieldId: 'custcol_hrc_cost_type',
            sublistId: sublistId,
          });
          var project = rec.getValue({
            fieldId: 'custbody_hrc_pci_project'
          });
          let projectLine = rec.getCurrentSublistValue({
            fieldId: 'customer',
            sublistId: sublistId,
          });
          rec.setCurrentSublistValue({
            fieldId: 'customer',
            sublistId: sublistId,
            value: project
          });
          if (costCodeVal) {
            rec.setCurrentSublistValue({
              fieldId: 'custcol_hrc_cost_code_line',
              sublistId: sublistId,
              value: costCodeVal,
            });
          }

          if (costCode && costType) {
            log.debug('getting item');
            var costTypeInfo = getCostTypeInfo(costType);
            if (costTypeInfo.itemType && costTypeInfo.code) {
              var arr = costCode.split(' ');
              if (arr.length > 1) {
                var name = '';
                for (var i = 1; i < arr.length; i++) {
                  name += arr[i]
                  if (i != arr.length - 1) {
                    name += ' ';
                  }
                }
                log.debug('name', name);
                var stAuxItemName = name + ' (' + costTypeInfo.code + ')';
                var objItemSearch = searchItemByName(stAuxItemName, costTypeInfo.itemType);
                if (objItemSearch.length && !rec.id && sublistId == 'item') {
                  rec.setCurrentSublistValue({
                    sublistId: sublistId,
                    fieldId: 'item',
                    value: objItemSearch[0].id
                  });
                  log.debug('item', objItemSearch[0].id);
                }

              }

            }
          }


        }
      } catch (ex) {
        log.error('ERROR ' + ex.message, JSON.stringify(ex));
      }
    }

    function postSourcing(context) {
      try {

        var rec = currentRecord.get();
        var sublistId = context.sublistId;
        log.debug('context ', context);
        if (context.fieldId == 'custcol_hrc_cost_code_') {
          var costCode = rec.getCurrentSublistText({
            fieldId: 'custcol_hrc_cost_code_',
            sublistId: sublistId,
          });
          var costCodeId = rec.getCurrentSublistValue({
            fieldId: 'custcol_hrc_cost_code_',
            sublistId: sublistId
          });
          log.debug('cost code ', costCodeId);

          if (costCodeId) {


            var stCostCodeLookup = search.lookupFields({
              type: 'customrecord_hrc_pci_costcode',
              id: costCodeId,
              columns: ['custrecord_hrc_pci_standardcostcodeid']
            });
            if (stCostCodeLookup && stCostCodeLookup.custrecord_hrc_pci_standardcostcodeid) {
              var standardId = searchStandardCostCode(stCostCodeLookup.custrecord_hrc_pci_standardcostcodeid);
              if (standardId) {
                rec.setCurrentSublistValue({
                  fieldId: 'custcol_r_it_std_cost_code',
                  sublistId: sublistId,
                  value: standardId
                });
              }
            }
            var costCodeSplit=costCode.split('-');
            log.debug('costcode split',costCodeSplit);
            if (costCodeSplit.length == 2 && (costCodeSplit[0] == '20' || costCodeSplit[0] == '30' || costCodeSplit[0] == '40' || costCodeSplit[0] == '50') && costCodeSplit[1].startsWith('111')) {
             
              rec.setCurrentSublistValue({
                fieldId: 'item',
                sublistId: sublistId,
                value: '59',
                ignoreFieldChange: true
              });
              rec.setCurrentSublistValue({
                fieldId: 'custcol_hrc_cost_type',
                sublistId: sublistId,
                value: '8',
                ignoreFieldChange: true
              });
              log.debug('set cost type ');
              return;
            }

          }

          var costArr = costCode.split('-');
          log.debug('cost arr', JSON.stringify(costArr));
          if (costArr.length >= 2) {
            var name = costArr[1];
            if (name) {
              var nameArr = name.split(' ');
              name = nameArr[0];
              log.debug('name', name);
              var costType = searchCostTypeByCostCode(name);
              if (costType) {
                log.debug('cost type ', costType);

                rec.setCurrentSublistValue({
                  fieldId: 'custcol_hrc_cost_type',
                  sublistId: sublistId,
                  value: costType
                });
              } else {
                log.debug('setting null');
                rec.setCurrentSublistValue({
                  fieldId: 'custcol_hrc_cost_type',
                  sublistId: sublistId,
                  value: ''
                });
              }
            }
          }
        }

        if (context.fieldId == 'item') {
          var costCode = rec.getCurrentSublistText({
            fieldId: 'custcol_hrc_cost_code_',
            sublistId: sublistId,
          });
          var costCodeVal = rec.getCurrentSublistValue({
            fieldId: 'custcol_hrc_cost_code_',
            sublistId: sublistId,
          });
          var costType = rec.getCurrentSublistValue({
            fieldId: 'custcol_hrc_cost_type',
            sublistId: sublistId,
          });
          var project = rec.getValue({
            fieldId: 'custbody_hrc_pci_project'
          });
          if (costCode) {
            var prefix = costCode.split('-')[0];
            var clas = getClassByPrefix(prefix);
            if (clas != null && clas != '') {
              rec.setCurrentSublistValue({
                fieldId: 'class',
                value: clas,
                sublistId: sublistId,
              });
            }
          }
          if (costCodeVal && costType && project) {
            var budgetLineId = getBudgetLine(costCodeVal, costType, project);
            if (budgetLineId) {
              rec.setCurrentSublistValue({
                fieldId: 'custcol_hrc_budget_line',
                sublistId: sublistId,
                value: budgetLineId,
              })
            } else {
              rec.setValue({
                fieldId: 'custbody_r_it_process_budget_line',
                value: true
              });
              if (rec.type == 'vendorbill' || rec.type == 'purchaseorder' || rec.type == 'vendorcredit') {
                alert('No budget line identified, please click OK to continue.');
              }
            }
          }
        }
      } catch (ex) {
        log.error('ERROR ' + ex.message, JSON.stringify(ex));
      }
    }

    function getClassByPrefix(prefix) {


      var mySearch = search.create({
        type: "customrecordr_it_pci_cc_and_classs",
        title: "Class Prefix",
        columns: [
          "custrecord_r_pci_ccac_class"
        ],
        filters: [{
          name: "custrecord_r_pci_ccac_cost_code_pref",
          operator: "is",
          values: [prefix],
        }],
      });
      var clas = ''
      mySearch.run().each(function (result) {
        clas = result.getValue('custrecord_r_pci_ccac_class');

        return true;
      });
      return clas;

    }

    function getCostTypeInfo(costType) {
      var mySearch = search.create({
        type: 'customrecord_hrc_cost_type',
        title: 'cost type search',
        columns: ['custrecordhrc_item_type', 'custrecord_hrc_pci_code2'],
        filters: [
          ['internalid', 'anyof', costType]
        ]
      });
      var obj = {
        itemType: '',
        code: ''
      };
      mySearch.run().each(function (result) {
        obj.itemType = result.getValue('custrecordhrc_item_type');
        obj.code = result.getValue('custrecord_hrc_pci_code2')
        return true;
      });
      return obj;
    }

    function getBudgetLine(costCode, costType, project) {
      log.debug('cost code ' + costCode + 'costtype' + costType + 'proj' + project);
      var mySearch = search.create({
        type: 'customrecord_hrc_pci_budgetviewdetailrow',
        title: 'Budget line Search',
        columns: [],
        filters: [
          ['custrecord_hrc_pci_cost_code', 'anyof', costCode],
          'AND',
          ['custrecord_hrc_cost_type_inbound', 'anyof', costType],
          'AND',
          ['custrecord_hrc_pci_bvl_project', 'anyof', project],
          'AND',
          ['isinactive', 'is', false],
        ]
      });
      var budgetLineId = null;
      mySearch.run().each(function (result) {
        budgetLineId = result.id;
      });
      return budgetLineId;
    }


    function searchItemByName(name, itemType) {

      var stLogTitle = 'searchItemByName';

      try {



        if (itemType == 1) {
          itemType = "InvtPart"
        } else if (itemType == 2) {
          itemType = "NonInvtPart"
        } else if (itemType == 3) {
          itemType = "Service"
        } else if (itemType == 4) {
          itemType = "OthCharge"
        }



        var itemSearch = search.load({
          id: 'customsearch_hrc_pci_noninventoryitems'
        });
        var itemSearchFilter = search.createFilter({
          name: 'name',
          operator: search.Operator.IS,
          values: name,

        });
        itemSearch.filters.push(itemSearchFilter);


        itemSearchFilter = search.createFilter({
          name: 'type',
          operator: search.Operator.IS,
          values: itemType,

        });
        //itemSearch.filters.push(itemSearchFilter);

        var result = itemSearch.run().getRange({
          start: 0,
          end: 1
        });


        return itemSearch.run().getRange({
          start: 0,
          end: 1
        });

      } catch (e) {
        log.error('ERROR', e);
      }
    }

    function searchCostTypeByCostCode(costCodeName) {
      var mySearch = search.create({
        type: 'customrecord_r_it_cc_ct_map',
        title: 'Cost Type by Cost Code',
        columns: ['custrecord_r_it_cc_ct_map_costtype'],
        filters: [
          ['name', 'is', costCodeName],
        ]
      });
      var costType = null;
      mySearch.run().each(function (result) {
        costType = result.getValue('custrecord_r_it_cc_ct_map_costtype');
      });
      return costType;
    }


    function searchStandardCostCode(stCostCode) {
      let mySearch = search.create({
        type: 'customrecord_r_it_list_code',
        title: 'SO Search',
        columns: null,
        filters: [{
          name: 'custrecord_r_it_std_list_cost_code_id',
          operator: 'is',
          values: stCostCode
        }]
      });
      let Id = '';
      mySearch.run().each(function (result) {
        Id = result.id
        return true;
      });
      return Id;
    }



    return {
      fieldChanged: fieldChanged,
      postSourcing: postSourcing
    }
  });