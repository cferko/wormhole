from flask import Flask, request
from flask_restful import Resource, Api
from sqlalchemy import create_engine
import json, sklearn.datasets, pandas as pd, numpy as np

## Fetch the information from the json file

my_config = json.load(open("example.json", "r"))
db_connection = my_config["conString"]

e = create_engine('sqlite:///iris.db')

app = Flask(__name__)
api = Api(app)

class FillDatabase(Resource):
    def get(self):
        #Connect to databse
        conn = e.connect()
        
        iris_dict = sklearn.datasets.load_iris()
        
        iris_targets = np.array([iris_dict["target_names"][i] 
                        for i in iris_dict["target"]])
        iris_targets = iris_targets.reshape((len(iris_targets), 1))
        
        iris_array = iris_dict["data"]
        iris_array = np.hstack((iris_array, iris_targets))
        
        iris_names = np.append(iris_dict["feature_names"], "species")
        
        iris_frame = pd.DataFrame(iris_array, columns=iris_names)
        
        #Perform query and return JSON data
        iris_frame.to_sql("iris", conn)
        return {'succeeded' : True}

class QuerySpecies(Resource):
    def get(self, species_name):
        conn = e.connect()
        query = conn.execute("SELECT * FROM iris WHERE species='%s'"%species_name)
        #Query the result and get cursor.Dumping that data to a JSON is looked by extension
        result = {'data': [dict(zip(tuple (query.keys()) ,i)) for i in query.cursor]}
        return result
 
api.add_resource(FillDatabase, '/fill')
api.add_resource(QuerySpecies, '/species/<string:species_name>')

if __name__ == '__main__':
     app.run()
     ## Browse to http://localhost:5000/fill
     ## Then go to http://localhost:5000/species/virginica