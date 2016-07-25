from flask import Flask, request, render_template
import sqlite3
   
app = Flask(__name__)

def execute_query(sql):
    con = sqlite3.connect("test.db")
    cur = con.cursor()
    
    result = ''    
    
    commands = sql.split(";")
    for command in commands:
        if len(commands)<1:
            continue
        clean_command = command.strip()
        out = cur.execute(clean_command).fetchall()
        con.commit()
        
        result += str(out) + "\n"
    
    return result

@app.route("/")
def hello():
    return render_template('tester.html')
 
@app.route("/", methods=['POST'])
def echo(): 
    sql = request.data
    return str(execute_query(sql))

if __name__ == "__main__":
    app.run()