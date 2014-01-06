create or replace function
exsp_sqp1(x int,y int) 
RETURNS int as $$
BEGIN
    return x*x+y;
END;
$$ LANGUAGE plpgsql;

select exsp_sqp1(y:=10,x:=6);
