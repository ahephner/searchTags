@isTest
public class test_flowParseMultiSelect {
    @isTest
    static void MultiSelectFlowValuesTest(){
        
        List<string> tempLst = new list<string>();
        tempLst.add('Alex');
        tempLst.add('Abby');

        test.startTest();
        	List<list<string>> x = flowParseMultiSelect.CheckValues(tempLst);
        test.stopTest();



    }
}