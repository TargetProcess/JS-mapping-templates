#### Basic Demo Use Case ####

Basic Demo Setup covers use case of two-way sync of simple hierarchy Epic -> Feature -> User Story.
Integration profile supposes static routings and project-to-project match. It means that AzDo project is synced to Targetprocess Project, and for demo case you have to add new Project to Targetprocess with the same name as AzDo Project or Root level of Area/Iteration Path. 

**PIs and Iterations**

Demo Use Case implements single-project PIs (Releases) and Team Iterations belong to Teams and PIs. 

We recommend to create Team Iterations in Targetprocess and then push them to Azure DevOps. 
To generate the iterations in Targetprocess, use generic solution for generating Team Iteration for PI. 

You can import Targetprocess Team Iterations to AzDo, if use two suggested automation rules. Rules are designed to demo the case with a single integration profile. All Team Iterations will be created in that Azure DevOps instance, in the same ROOT (project) as Program Increment. 
This logic is covered with two rules. On PI entity you need a custom field 'Import Team Iterations to AzDO' of checkbox type. 
As soon as you check the box, Team Iterations are replicated in Azure DevOps as Sprints in the same Program Increment and Project, as in Targetprocess. 
In case you want to re-push the iterations, uncheck the field and check it again – all missing sprints will be created in Azure DevOps Iteration Paths. 



```
Iteration Path convention:
ROOT\PI\TI
```

Iterations originally created in Azure DevOps must be added to Targetprocess manually. Automated import of Azure DevOps Sprints is complicated and not recommended due to Start/End Dates restrictions. 



**ARTs and Teams**

Azure DevOps teams or ARTs will be created in Targetprocess, in case such names were not found during the work items sync. 
Targetprocess ARTs and Team will not be created automatically in Azure DevOps. It is possible to create an automation rule for one-time import, but it's not a permanent solution to keep track of Teams and ARTs updates  

```
Area Path convention:
ROOT\ART\Team
```
