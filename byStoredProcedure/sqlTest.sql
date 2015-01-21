create or replace function
exsp_test_one(x int,y int) 
RETURNS int as $$
BEGIN
    return x*x+y;
END;
$$ LANGUAGE plpgsql;

select exsp_test_one(y:=10,x:=6);

drop table if exists tbl_test cascade;
create table if not exists tbl_test (
    foo varchar(100),
    bar int
);
insert into tbl_test values ('cheese',7),('fries',13);

create or replace function
exsp_test_many()
RETURNS SETOF tbl_test
as $body$
BEGIN
    return query select * from tbl_test;
END;
$body$ LANGUAGE plpgsql;

select exsp_test_many();

create or replace function
exsp_test_exception()
RETURNS boolean
as $body$
BEGIN
    RAISE EXCEPTION 'foo bar';
END;
$body$ LANGUAGE plpgsql;
